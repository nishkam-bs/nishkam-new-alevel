/* =====================================================================
   Nishkam A-level tracker (7138 site, Year 12)
   Copied from the 7132 tracker. It has its own D1 database, so the
   two classes never share accounts or results.
   Student accounts, saved progress that follows the student between
   devices, and the teacher dashboard.

   Storage: Cloudflare D1, bound as DB.
   Secret:  TEACHER_PASSWORD (set in Cloudflare, never in this file).
   Secret:  CONTENT_KEY (unlocks the protected case studies; set in Cloudflare).
   Var:     ALLOWED_ORIGINS (comma separated, set in wrangler.toml).

   No student data or passwords are kept in this file or in the repo.
   Passwords are stored only as salted PBKDF2 hashes. Session tokens
   are stored only as SHA-256 hashes.
   ===================================================================== */

const ITER = 20000;                       // PBKDF2 iterations (kept modest for the Workers CPU limit)
const STUDENT_DAYS = 365;                 // students stay signed in for a school year
const TEACHER_HOURS = 12;
const MAX_KEY_BYTES = 200000;             // one saved item
const MAX_KEYS = 300;                     // saved items per student
const LOCK_AFTER = 8, LOCK_MINUTES = 10;  // failed sign-ins before a short lock

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users(username TEXT PRIMARY KEY, name TEXT NOT NULL, pw TEXT NOT NULL,
     must_change INTEGER NOT NULL DEFAULT 1, created TEXT NOT NULL, last_seen TEXT)`,
  `CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, username TEXT NOT NULL, role TEXT NOT NULL, expires INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS store(username TEXT NOT NULL, k TEXT NOT NULL, data TEXT NOT NULL, t INTEGER NOT NULL, PRIMARY KEY(username,k))`,
  `CREATE TABLE IF NOT EXISTS attempts(id INTEGER PRIMARY KEY AUTOINCREMENT, qid TEXT, username TEXT NOT NULL, t TEXT NOT NULL,
     stage INTEGER, title TEXT, score INTEGER, total INTEGER, passed INTEGER, missed TEXT, answer TEXT)`,
  `CREATE TABLE IF NOT EXISTS marks(id INTEGER PRIMARY KEY AUTOINCREMENT, qid TEXT, username TEXT NOT NULL, t TEXT NOT NULL,
     tool TEXT, question TEXT, mark TEXT, level TEXT, well TEXT, improve TEXT, answer TEXT)`,
  `CREATE TABLE IF NOT EXISTS blurts(id INTEGER PRIMARY KEY AUTOINCREMENT, qid TEXT, username TEXT NOT NULL, t TEXT NOT NULL,
     kind TEXT, ref TEXT, topic TEXT, got INTEGER, total INTEGER, detail TEXT)`,
  `CREATE TABLE IF NOT EXISTS fails(k TEXT PRIMARY KEY, n INTEGER NOT NULL, until INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS work(id TEXT PRIMARY KEY, username TEXT NOT NULL, source TEXT NOT NULL, title TEXT, spec TEXT NOT NULL,
     status TEXT NOT NULL, created TEXT NOT NULL, due TEXT, answers TEXT, result TEXT, score REAL, total REAL, done_at TEXT)`,
  `CREATE INDEX IF NOT EXISTS work_user ON work(username)`,
  `CREATE TABLE IF NOT EXISTS visits(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, t TEXT NOT NULL, page TEXT NOT NULL, title TEXT)`,
  `CREATE INDEX IF NOT EXISTS visits_user ON visits(username,page,t)`,
  `CREATE TABLE IF NOT EXISTS notes(username TEXT PRIMARY KEY, text TEXT, t TEXT)`,
  `CREATE TABLE IF NOT EXISTS sched(id TEXT PRIMARY KEY, due TEXT NOT NULL, kind TEXT NOT NULL, ref TEXT, title TEXT, detail TEXT,
     marks INTEGER, who TEXT NOT NULL DEFAULT 'all', sort INTEGER DEFAULT 0, created TEXT)`,
  `CREATE TABLE IF NOT EXISTS excuse(sched_id TEXT NOT NULL, username TEXT NOT NULL, note TEXT, t TEXT, PRIMARY KEY(sched_id,username))`,
  `CREATE INDEX IF NOT EXISTS attempts_user ON attempts(username)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS attempts_qid ON attempts(qid)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS marks_qid ON marks(qid)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS blurts_qid ON blurts(qid)`,
  `CREATE INDEX IF NOT EXISTS marks_user ON marks(username)`,
  `CREATE INDEX IF NOT EXISTS blurts_user ON blurts(username)`,
  `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(username)`,
  `CREATE TABLE IF NOT EXISTS redrafts(id TEXT PRIMARY KEY, username TEXT NOT NULL, mark_qid TEXT, created TEXT NOT NULL, due TEXT,
     tool TEXT, question TEXT, mark TEXT, lost REAL, skill TEXT, excerpt TEXT, problem TEXT, better TEXT,
     answer TEXT, how TEXT, verdict TEXT, feedback TEXT, tries INTEGER NOT NULL DEFAULT 0, submitted TEXT, done_at TEXT, status TEXT NOT NULL DEFAULT 'set')`,
  `CREATE INDEX IF NOT EXISTS redrafts_user ON redrafts(username)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS redrafts_mark ON redrafts(mark_qid)`,
  `CREATE TABLE IF NOT EXISTS follow(id TEXT PRIMARY KEY, username TEXT NOT NULL, topic TEXT NOT NULL, created TEXT NOT NULL,
     kinds TEXT, before REAL, work_id TEXT, deck TEXT, why TEXT)`,
  `CREATE INDEX IF NOT EXISTS follow_user ON follow(username)`
];
let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch(SCHEMA.map(s => db.prepare(s)));
  /* columns added after the first version */
  for (const sql of ['ALTER TABLE marks ADD COLUMN ref TEXT', 'ALTER TABLE marks ADD COLUMN how TEXT', 'ALTER TABLE follow ADD COLUMN sent_by TEXT']) { try { await db.prepare(sql).run(); } catch (e) {} }
  schemaReady = true;
}

/* ---------- small helpers ---------- */
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const enc = new TextEncoder();
const nowIso = () => new Date().toISOString();
const str = (v, max) => String(v == null ? '' : v).slice(0, max);
/* each result carries an id made on the device, so a result sent twice is only saved once */
const qid = b => { const q = str(b.qid, 40); return q || null; };
const int = v => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : 0; };
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const rand = n => crypto.getRandomValues(new Uint8Array(n));
async function sha256(s) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(s))); }
function same(a, b) {               // constant-time string compare
  const x = enc.encode(String(a)), y = enc.encode(String(b));
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}

async function hashPassword(pw, saltB64, iter = ITER) {
  const salt = saltB64 ? Uint8Array.from(atob(saltB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)) : rand(16);
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256);
  return `pbkdf2$${iter}$${b64u(salt)}$${b64u(bits)}`;
}
async function checkPassword(pw, stored) {
  const [kind, iter, salt] = String(stored).split('$');
  if (kind !== 'pbkdf2') return false;
  return same(await hashPassword(pw, salt, +iter), stored);
}

/* one-time passwords: word-4digits-word, easy to type, not easy to guess */
const WORDS = ('amber anchor apple arrow aspen badge baker basin beach berry birch blaze bloom brick brook cabin cable camel candle canyon cargo cedar chalk cherry cliff clover cobalt comet coral cotton crane crown crystal dawn delta denim desert dolphin dune eagle ember falcon fern field flint forest fossil frost garden ginger glacier globe granite grape gravel harbour hazel heron hollow honey island ivory jade jasmine jungle kettle kite lagoon lantern lemon lily linen lotus maple marble meadow mint mirror moss nectar oak ocean olive orbit orchid otter panda paper pearl pebble pepper pine planet plum pocket prism quartz quill raven reef ribbon river robin rocket saddle salmon shell silver slate spruce stone summit swallow thistle thunder tiger timber topaz tulip valley velvet violet walnut willow winter yarrow zephyr').split(' ');
function oneTimePassword() {
  const r = rand(4);
  const w1 = WORDS[((r[0] << 8) | r[1]) % WORDS.length], w2 = WORDS[((r[2] << 8) | r[3]) % WORDS.length];
  const d = String(1000 + (crypto.getRandomValues(new Uint16Array(1))[0] % 9000));
  return `${w1}-${d}-${w2}`;
}
const UCHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
function newUsername() { return 'nk-' + [...rand(4)].map(b => UCHARS[b % UCHARS.length]).join(''); }

/* ---------- sessions ---------- */
async function newSession(db, username, role, hours) {
  const token = b64u(rand(32));
  await db.prepare('INSERT INTO sessions(token,username,role,expires) VALUES(?,?,?,?)')
    .bind(await sha256(token), username, role, Date.now() + hours * 3600000).run();
  return token;
}
async function session(db, token, role) {
  if (!token || typeof token !== 'string') throw new HttpError(401, 'Please sign in again.');
  const row = await db.prepare('SELECT username,role,expires FROM sessions WHERE token=?').bind(await sha256(token)).first();
  if (!row || row.role !== role || row.expires < Date.now()) throw new HttpError(401, 'Please sign in again.');
  return row.username;
}
async function student(db, body) {
  const u = await session(db, body.token, 'student');
  const user = await db.prepare('SELECT username,name,must_change FROM users WHERE username=?').bind(u).first();
  if (!user) throw new HttpError(401, 'Please sign in again.');
  return user;
}

/* ---------- failed sign-in limits ---------- */
async function locked(db, k) {
  const r = await db.prepare('SELECT n,until FROM fails WHERE k=?').bind(k).first();
  return r && r.until > Date.now();
}
async function fail(db, k) {
  const r = await db.prepare('SELECT n,until FROM fails WHERE k=?').bind(k).first();
  const recent = r && r.until > Date.now() - LOCK_MINUTES * 60000 && !(r.n >= LOCK_AFTER && r.until <= Date.now());
  const n = recent ? r.n + 1 : 1;
  const until = n >= LOCK_AFTER ? Date.now() + LOCK_MINUTES * 60000 : Date.now();
  await db.prepare('INSERT INTO fails(k,n,until) VALUES(?,?,?) ON CONFLICT(k) DO UPDATE SET n=excluded.n, until=excluded.until').bind(k, n, until).run();
}
const clearFails = (db, k) => db.prepare('DELETE FROM fails WHERE k=?').bind(k).run();

/* ---------- redrafts: one targeted part of a marked answer ---------- */
const REDRAFTS_PER_WEEK = 2;      // redrafts that count towards a weekly deadline; any more are optional
const REDRAFT_TRIES = 2;
const dayIso = d => d.toISOString().slice(0, 10);
/* the first homework deadline at least four days away, so a student always has a few days */
async function nextDue(db) {
  const from = dayIso(new Date(Date.now() + 4 * 86400000));
  const r = await db.prepare('SELECT MIN(due) AS due FROM sched WHERE due>=?').bind(from).first();
  return r && r.due ? r.due : null;
}
function parseMark(m) { const x = String(m || '').match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+)/); return x ? { got: +x[1], max: +x[2] } : null; }
async function createRedraft(db, username, b, markQid) {
  const t = b.target, pm = parseMark(b.mark);
  if (!t || typeof t !== 'object' || !pm || pm.max < 6) return;   // 6, 9 and 15-mark answers
  if (pm.max - pm.got < 2 || pm.got / pm.max >= 0.85) return;   // nothing worth redrafting
  const lost = Math.round(100 * (pm.max - pm.got) / pm.max);     // share of the marks lost, so a 9-marker can outrank a 25-marker
  const problem = str(t.problem, 600).trim();
  if (problem.length < 15) return;
  let due = await nextDue(db);
  if (due) {
    const { results } = await db.prepare('SELECT id,lost,submitted FROM redrafts WHERE username=? AND due=?').bind(username, due).all();
    if (results.length >= REDRAFTS_PER_WEEK) {
      /* keep the ones where the most marks were lost; the other becomes optional */
      const open = results.filter(r => !r.submitted).sort((a, c) => (a.lost || 0) - (c.lost || 0));
      if (open.length && lost > (open[0].lost || 0)) await db.prepare('UPDATE redrafts SET due=NULL WHERE id=?').bind(open[0].id).run();
      else due = null;
    }
  }
  await db.prepare(`INSERT OR IGNORE INTO redrafts(id,username,mark_qid,created,due,tool,question,mark,lost,skill,excerpt,problem,better,status)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,'set')`).bind('r-' + b64u(rand(9)), username, markQid, nowIso(), due, str(b.tool, 60), str(b.question, 500),
    str(b.mark, 20), lost, str(t.skill, 40), str(t.excerpt, 1500), problem, str(t.better, 1500)).run();
}

async function addFollow(db, username, b, by) {
  const topic = str(b.topic, 20);
  if (!/^3\.\d{1,2}\.\d{1,2}[a-z]?$/.test(topic)) throw new HttpError(400, 'Unknown topic.');
  if (!b.spec || !Array.isArray(b.spec.items) || b.spec.items.length < 3) throw new HttpError(400, 'Not enough questions.');
  const spec = JSON.stringify(b.spec);
  if (spec.length > MAX_KEY_BYTES) throw new HttpError(413, 'Too large.');
  const id = 'f-' + b64u(rand(9)), wid = 'w-' + b64u(rand(9)), t = nowIso(), due = await nextDue(db);
  await db.batch([
    db.prepare("INSERT INTO work(id,username,source,title,spec,status,created,due) VALUES(?,?,'auto',?,?,'set',?,?)").bind(wid, username, str(b.spec.title, 160), spec, t, due),
    db.prepare('INSERT INTO follow(id,username,topic,created,kinds,before,work_id,deck,why,sent_by) VALUES(?,?,?,?,?,?,?,?,?,?)')
      .bind(id, username, topic, t, str(Array.isArray(b.kinds) ? b.kinds.join(',') : b.kinds, 120), Number(b.before) || 0, wid, str(b.deck, 40) || null, str(b.why, 600), by)
  ]);
  return { id, workId: wid, due };
}

/* =====================================================================
   Routes
   ===================================================================== */
const routes = {
  /* ----- students ----- */
  async '/login'(db, b) {
    const username = str(b.username, 40).trim().toLowerCase(), pw = str(b.password, 200);
    if (!username || !pw) throw new HttpError(400, 'Enter your username and password.');
    if (await locked(db, 'u:' + username)) throw new HttpError(429, `Too many tries. Wait ${LOCK_MINUTES} minutes and try again.`);
    const user = await db.prepare('SELECT username,name,pw,must_change FROM users WHERE username=?').bind(username).first();
    if (!user || !(await checkPassword(pw, user.pw))) {
      await fail(db, 'u:' + username);
      throw new HttpError(401, 'That username and password do not match. Check them and try again.');
    }
    await clearFails(db, 'u:' + username);
    await db.prepare('DELETE FROM sessions WHERE expires<?').bind(Date.now()).run();
    await db.prepare('UPDATE users SET last_seen=? WHERE username=?').bind(nowIso(), username).run();
    const token = await newSession(db, username, 'student', STUDENT_DAYS * 24);
    return { token, username, name: user.name, mustChange: !!user.must_change };
  },

  async '/me'(db, b) {
    const u = await student(db, b);
    await db.prepare('UPDATE users SET last_seen=? WHERE username=?').bind(nowIso(), u.username).run();
    return { username: u.username, name: u.name, mustChange: !!u.must_change };
  },

  async '/password'(db, b) {
    const u = await student(db, b);
    const row = await db.prepare('SELECT pw FROM users WHERE username=?').bind(u.username).first();
    const next = str(b.next, 200);
    if (!(await checkPassword(str(b.current, 200), row.pw))) throw new HttpError(400, 'Your current password is not right.');
    if (next.length < 8) throw new HttpError(400, 'Your new password needs at least 8 characters.');
    if (next.toLowerCase().includes(u.username)) throw new HttpError(400, 'Do not use your username in your password.');
    await db.prepare('UPDATE users SET pw=?, must_change=0 WHERE username=?').bind(await hashPassword(next), u.username).run();
    return { ok: true };
  },

  async '/logout'(db, b) {
    if (b.token) await db.prepare('DELETE FROM sessions WHERE token=?').bind(await sha256(String(b.token))).run();
    return { ok: true };
  },

  /* push local changes and pull everything back. Newer timestamp wins for each item. */
  async '/sync'(db, b) {
    const u = await student(db, b);
    const items = Array.isArray(b.items) ? b.items.slice(0, 100) : [];
    const stmts = [];
    for (const it of items) {
      const k = str(it && it.k, 120), t = int(it && it.t);
      if (!k || !t) continue;
      const data = JSON.stringify(it.data === undefined ? null : it.data);
      if (data.length > MAX_KEY_BYTES) throw new HttpError(413, 'Some of your work is too large to save.');
      stmts.push(db.prepare(`INSERT INTO store(username,k,data,t) VALUES(?,?,?,?)
        ON CONFLICT(username,k) DO UPDATE SET data=excluded.data, t=excluded.t WHERE excluded.t > store.t`).bind(u.username, k, data, t));
    }
    if (stmts.length) {
      const count = await db.prepare('SELECT COUNT(*) AS n FROM store WHERE username=?').bind(u.username).first();
      if (count.n + stmts.length > MAX_KEYS + 100) throw new HttpError(413, 'Too many saved items.');
      await db.batch(stmts);
    }
    const { results } = await db.prepare('SELECT k,data,t FROM store WHERE username=?').bind(u.username).all();
    const out = {};
    for (const r of results) { try { out[r.k] = { data: JSON.parse(r.data), t: r.t }; } catch (e) {} }
    return { items: out, now: Date.now() };
  },

  async '/log'(db, b) {
    const u = await student(db, b);
    await db.prepare('INSERT OR IGNORE INTO attempts(qid,username,t,stage,title,score,total,passed,missed,answer) VALUES(?,?,?,?,?,?,?,?,?,?)')
      .bind(qid(b), u.username, nowIso(), int(b.stage), str(b.stageTitle, 200), int(b.score), int(b.total), b.passed ? 1 : 0,
        JSON.stringify((Array.isArray(b.missed) ? b.missed : []).slice(0, 30).map(m => str(m, 300))), str(b.answer, 12000)).run();
    return { ok: true };
  },

  async '/visit'(db, b) {
    const u = await student(db, b);
    const page = str(b.page, 80).replace(/[^\w .()-]/g, '').slice(0, 80) || 'index';
    const since = new Date(Date.now() - 10 * 60000).toISOString();
    const recent = await db.prepare('SELECT id FROM visits WHERE username=? AND page=? AND t>? LIMIT 1').bind(u.username, page, since).first();
    if (!recent) await db.prepare('INSERT INTO visits(username,t,page,title) VALUES(?,?,?,?)').bind(u.username, nowIso(), page, str(b.title, 120)).run();
    await db.prepare('UPDATE users SET last_seen=? WHERE username=?').bind(nowIso(), u.username).run();
    return { ok: true };
  },

  async '/mark'(db, b) {
    const u = await student(db, b);
    if (!b.tool) throw new HttpError(400, 'Missing tool.');
    await db.prepare('INSERT OR IGNORE INTO marks(qid,username,t,tool,question,mark,level,well,improve,answer,ref,how) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(qid(b), u.username, nowIso(), str(b.tool, 60), str(b.question, 500), str(b.mark, 20), str(b.level, 60),
        str(b.well, 1200), str(b.improve, 1200), str(b.answer, 12000), str(b.ref, 60) || null, str(b.how, 300) || null).run();
    if (b.target && qid(b)) { try { await createRedraft(db, u.username, b, qid(b)); } catch (e) { console.error('redraft', e && e.stack || e); } }
    return { ok: true };
  },

  /* ----- redrafts ----- */
  async '/redraft/mine'(db, b) {
    const u = await student(db, b);
    const [rd, ex] = await db.batch([
      db.prepare('SELECT id,created,due,tool,question,mark,lost,skill,excerpt,problem,better,answer,verdict,feedback,tries,submitted,done_at,status FROM redrafts WHERE username=? ORDER BY created DESC LIMIT 60').bind(u.username),
      db.prepare("SELECT sched_id FROM excuse WHERE username=? AND sched_id LIKE 'rd:%'").bind(u.username)
    ]);
    return { redrafts: rd.results, excused: ex.results.map(x => x.sched_id.slice(3)), tries: REDRAFT_TRIES };
  },

  async '/redraft/submit'(db, b) {
    const u = await student(db, b);
    const r = await db.prepare('SELECT id,tries,status FROM redrafts WHERE id=? AND username=?').bind(str(b.id, 40), u.username).first();
    if (!r) throw new HttpError(404, 'That redraft could not be found.');
    if (r.status === 'fixed' || r.tries >= REDRAFT_TRIES) throw new HttpError(409, 'This redraft is finished.');
    const verdict = ['fixed', 'partly', 'notyet'].includes(b.verdict) ? b.verdict : 'partly';
    const tries = r.tries + 1;
    const status = verdict === 'fixed' ? 'fixed' : tries >= REDRAFT_TRIES ? (verdict === 'notyet' ? 'flag' : 'partly') : verdict;
    const t = nowIso();
    await db.prepare('UPDATE redrafts SET answer=?, how=?, verdict=?, feedback=?, tries=?, status=?, done_at=?, submitted=COALESCE(submitted,?) WHERE id=?')
      .bind(str(b.answer, 6000), str(b.how, 300) || null, verdict, str(b.feedback, 1500), tries, status, t, t, r.id).run();
    return { ok: true, status, tries, left: REDRAFT_TRIES - tries };
  },

  /* ----- automatic follow-up for a gap that shows up in more than one place ----- */
  async '/follow/mine'(db, b) {
    const u = await student(db, b);
    const [mk, at, bl, wk, st, fl, rd] = await db.batch([
      db.prepare('SELECT t,tool,question,mark,level,well,improve,ref FROM marks WHERE username=? ORDER BY id DESC LIMIT 400').bind(u.username),
      db.prepare('SELECT t,stage,title,score,total,passed,missed FROM attempts WHERE username=? ORDER BY id DESC LIMIT 1500').bind(u.username),
      db.prepare('SELECT t,kind,ref,topic,got,total FROM blurts WHERE username=? ORDER BY id DESC LIMIT 600').bind(u.username),
      db.prepare('SELECT id,source,title,spec,status,created,due,result,score,total,done_at FROM work WHERE username=? ORDER BY created DESC LIMIT 80').bind(u.username),
      db.prepare("SELECT k,data FROM store WHERE username=? AND (k LIKE 'course:%' OR k='blurt:history' OR k='rfgate')").bind(u.username),
      db.prepare('SELECT id,topic,created,kinds,before,work_id,deck,why FROM follow WHERE username=? ORDER BY created DESC LIMIT 60').bind(u.username),
      db.prepare('SELECT created,skill,verdict,status,submitted FROM redrafts WHERE username=? AND submitted IS NOT NULL ORDER BY created DESC LIMIT 60').bind(u.username)
    ]);
    const parse = (x, d) => { try { return x ? JSON.parse(x) : d; } catch (e) { return d; } };
    const store = {}; st.results.forEach(r => { store[r.k] = parse(r.data, null); });
    return {
      marks: mk.results, store, follows: fl.results, redrafts: rd.results,
      attempts: at.results.map(r => Object.assign({}, r, { stageTitle: r.title, passed: !!r.passed, missed: parse(r.missed, []) })),
      blurts: bl.results,
      work: wk.results.map(w => Object.assign({}, w, { spec: parse(w.spec, {}), result: parse(w.result, null) }))
    };
  },

  async '/follow/create'(db, b) {
    const u = await student(db, b);
    /* each gap gets its own follow-up; the same topic is not followed up while one is open on it or within a week */
    const open = await db.prepare("SELECT f.id FROM follow f LEFT JOIN work w ON w.id=f.work_id WHERE f.username=? AND f.topic=? AND (w.status!='done' OR f.created>?) LIMIT 1")
      .bind(u.username, str(b.topic, 20), new Date(Date.now() - 7 * 86400000).toISOString()).first();
    if (open) throw new HttpError(409, 'Already followed up recently.');
    return addFollow(db, u.username, b, 'auto');
  },

  /* the teacher sends a follow-up straight away (no waiting rules) */
  async '/follow/send'(db, b) {
    await session(db, b.token, 'teacher');
    const username = str(b.username, 40);
    if (!(await db.prepare('SELECT 1 FROM users WHERE username=?').bind(username).first())) throw new HttpError(404, 'No account with that username.');
    return addFollow(db, username, b, 'teacher');
  },

  async '/blurt'(db, b) {
    const u = await student(db, b);
    await db.prepare('INSERT OR IGNORE INTO blurts(qid,username,t,kind,ref,topic,got,total,detail) VALUES(?,?,?,?,?,?,?,?,?)')
      .bind(qid(b), u.username, nowIso(), b.kind === 'rapid' ? 'rapid' : 'blurt', str(b.ref, 20), str(b.topic, 160), int(b.got), int(b.total),
        str(typeof b.detail === 'string' ? b.detail : JSON.stringify(b.detail || ''), 4000)).run();
    return { ok: true };
  },

  async '/mymarks'(db, b) {
    const u = await student(db, b);
    const { results } = await db.prepare('SELECT t,tool,question,mark,level,well,improve,ref FROM marks WHERE username=? ORDER BY id DESC LIMIT 60').bind(u.username).all();
    return { marks: results };
  },

  /* ----- teacher ----- */
  async '/teacher'(db, b, env) {
    if (!env.TEACHER_PASSWORD) throw new HttpError(500, 'The teacher password has not been set up yet.');
    if (await locked(db, 'teacher')) throw new HttpError(429, `Too many tries. Wait ${LOCK_MINUTES} minutes.`);
    if (!same(str(b.password, 200), env.TEACHER_PASSWORD)) { await fail(db, 'teacher'); throw new HttpError(401, 'Wrong password.'); }
    await clearFails(db, 'teacher');
    return { token: await newSession(db, '_teacher', 'teacher', TEACHER_HOURS) };
  },

  async '/dashboard'(db, b) {
    await session(db, b.token, 'teacher');
    const [users, att, mk, bl, st, wk, nt, sc, ex, vs, rd, fl] = await db.batch([
      db.prepare('SELECT username,name,must_change,created,last_seen FROM users ORDER BY name'),
      db.prepare('SELECT username,t,stage,title,score,total,passed,missed,answer FROM attempts ORDER BY id DESC LIMIT 8000'),
      db.prepare('SELECT username,t,tool,question,mark,level,well,improve,answer,ref,how FROM marks ORDER BY id DESC LIMIT 3000'),
      db.prepare('SELECT username,t,kind,ref,topic,got,total,detail FROM blurts ORDER BY id DESC LIMIT 4000'),
      db.prepare("SELECT username,k,data,t FROM store WHERE k LIKE 'course:%' OR k LIKE 'quiz:%' OR k LIKE 'drill:%' OR k='blurt:history' OR k='rfgate'"),
      db.prepare('SELECT id,username,source,title,spec,status,created,due,answers,result,score,total,done_at FROM work ORDER BY created DESC LIMIT 1500'),
      db.prepare('SELECT username,text,t FROM notes'),
      db.prepare('SELECT id,due,kind,ref,title,detail,marks,who,sort FROM sched ORDER BY due,sort'),
      db.prepare('SELECT sched_id,username,note,t FROM excuse'),
      db.prepare('SELECT username,t,page,title FROM visits WHERE t>? ORDER BY id DESC LIMIT 4000').bind(new Date(Date.now() - 31 * 86400000).toISOString()),
      db.prepare('SELECT id,username,created,due,tool,question,mark,lost,skill,excerpt,problem,answer,how,verdict,feedback,tries,submitted,done_at,status FROM redrafts ORDER BY created DESC LIMIT 2000'),
      db.prepare('SELECT id,username,topic,created,kinds,before,work_id,deck,why,sent_by FROM follow ORDER BY created DESC LIMIT 1000')
    ]);
    const store = {}, storeT = {};
    st.results.forEach(r => { try { (store[r.username] = store[r.username] || {})[r.k] = JSON.parse(r.data); (storeT[r.username] = storeT[r.username] || {})[r.k] = r.t; } catch (e) {} });
    const parse = (x, d) => { try { return x ? JSON.parse(x) : d; } catch (e) { return d; } };
    const roster = {};
    users.results.forEach(u => { roster[u.username] = u.name; });
    const name = x => roster[x] || x;
    return {
      roster,
      accounts: users.results.map(u => ({ username: u.username, name: u.name, mustChange: !!u.must_change, created: u.created, lastSeen: u.last_seen })),
      rows: att.results.map(r => ({ exam: r.username, name: name(r.username), t: r.t, stage: r.stage, stageTitle: r.title, score: r.score, total: r.total,
        passed: !!r.passed, missed: (() => { try { return JSON.parse(r.missed || '[]'); } catch (e) { return []; } })(), answer: r.answer || '' })),
      marks: mk.results.map(r => Object.assign({ exam: r.username, name: name(r.username) }, r)),
      blurts: bl.results.map(r => Object.assign({ exam: r.username, name: name(r.username) }, r)),
      store,
      storeT,
      visits: vs.results.map(v => Object.assign({ exam: v.username, name: name(v.username) }, v)),
      work: wk.results.map(w => Object.assign({}, w, { exam: w.username, name: name(w.username), spec: parse(w.spec, {}), answers: parse(w.answers, {}), result: parse(w.result, null) })),
      notes: Object.fromEntries(nt.results.map(n => [n.username, { text: n.text, t: n.t }])),
      sched: sc.results.map(x => Object.assign({}, x, { who: parse(x.who, 'all') })),
      excuses: ex.results,
      redrafts: rd.results.map(r => Object.assign({ exam: r.username, name: name(r.username) }, r)),
      follows: fl.results.map(f => Object.assign({ exam: f.username, name: name(f.username) }, f))
    };
  },


  /* ----- set work and practice ----- */
  async '/work/set'(db, b) {
    await session(db, b.token, 'teacher');
    const list = (Array.isArray(b.items) ? b.items : []).slice(0, 60);
    const ids = [];
    const stmts = [];
    for (const it of list) {
      const spec = JSON.stringify(it.spec || {});
      if (spec.length > MAX_KEY_BYTES) throw new HttpError(413, 'That set of work is too large.');
      const id = 'w-' + b64u(rand(9));
      ids.push(id);
      stmts.push(db.prepare('INSERT INTO work(id,username,source,title,spec,status,created,due) VALUES(?,?,?,?,?,?,?,?)')
        .bind(id, str(it.username, 40), 'teacher', str(it.title, 160), spec, 'set', nowIso(), str(it.due, 20) || null));
    }
    if (stmts.length) await db.batch(stmts);
    return { ids };
  },

  async '/work/delete'(db, b) {
    await session(db, b.token, 'teacher');
    await db.prepare('DELETE FROM work WHERE id=?').bind(str(b.id, 40)).run();
    return { ok: true };
  },

  async '/work/self'(db, b) {
    const u = await student(db, b);
    const spec = JSON.stringify(b.spec || {});
    if (spec.length > MAX_KEY_BYTES) throw new HttpError(413, 'That set is too large.');
    const n = await db.prepare("SELECT COUNT(*) AS n FROM work WHERE username=? AND source='self' AND created>?").bind(u.username, new Date(Date.now() - 86400000).toISOString()).first();
    if (n.n >= 30) throw new HttpError(429, 'You have made a lot of sets today. Finish some of them first.');
    const id = 'w-' + b64u(rand(9));
    await db.prepare('INSERT INTO work(id,username,source,title,spec,status,created) VALUES(?,?,?,?,?,?,?)')
      .bind(id, u.username, 'self', str(b.title, 160), spec, 'set', nowIso()).run();
    return { id };
  },

  async '/work/mine'(db, b) {
    const u = await student(db, b);
    const { results } = await db.prepare('SELECT id,source,title,spec,status,created,due,answers,result,score,total,done_at FROM work WHERE username=? ORDER BY created DESC LIMIT 80').bind(u.username).all();
    const parse = (x, d) => { try { return x ? JSON.parse(x) : d; } catch (e) { return d; } };
    return { work: results.map(w => Object.assign({}, w, { spec: parse(w.spec, {}), answers: parse(w.answers, {}), result: parse(w.result, null) })) };
  },

  async '/work/save'(db, b) {
    const u = await student(db, b);
    const ans = JSON.stringify(b.answers || {});
    if (ans.length > MAX_KEY_BYTES) throw new HttpError(413, 'Your answers are too long to save.');
    await db.prepare("UPDATE work SET answers=?, status=CASE WHEN status='done' THEN status ELSE 'started' END WHERE id=? AND username=?").bind(ans, str(b.id, 40), u.username).run();
    return { ok: true };
  },

  async '/work/submit'(db, b) {
    const u = await student(db, b);
    const res = JSON.stringify(b.result || {});
    if (res.length > MAX_KEY_BYTES) throw new HttpError(413, 'Too much to save.');
    await db.prepare("UPDATE work SET answers=?, result=?, score=?, total=?, status='done', done_at=? WHERE id=? AND username=?")
      .bind(JSON.stringify(b.answers || {}), res, Number(b.score) || 0, Number(b.total) || 0, nowIso(), str(b.id, 40), u.username).run();
    return { ok: true };
  },

  async '/notes/save'(db, b) {
    await session(db, b.token, 'teacher');
    await db.prepare('INSERT INTO notes(username,text,t) VALUES(?,?,?) ON CONFLICT(username) DO UPDATE SET text=excluded.text, t=excluded.t')
      .bind(str(b.username, 40), str(b.text, 8000), nowIso()).run();
    return { ok: true };
  },


  /* ----- assessment schedule ----- */
  /* key for the protected case studies (drills); only for signed-in students and the teacher */
  async '/content/key'(db, b, env) {
    let ok = false;
    try { await student(db, b); ok = true; } catch (e) { }
    if (!ok) await session(db, b.token, 'teacher');
    if (!env.CONTENT_KEY) throw new HttpError(503, 'The case studies have not been switched on yet. Please tell your teacher.');
    return { key: env.CONTENT_KEY };
  },

  async '/sched/mine'(db, b) {
    const u = await student(db, b);
    const [sc, ex, mk, at] = await db.batch([
      db.prepare('SELECT id,due,kind,ref,title,detail,marks,who,sort FROM sched ORDER BY due,sort'),
      db.prepare('SELECT sched_id,note FROM excuse WHERE username=?').bind(u.username),
      db.prepare('SELECT ref,MIN(t) AS t,COUNT(*) AS n FROM marks WHERE username=? AND ref IS NOT NULL GROUP BY ref').bind(u.username),
      db.prepare('SELECT stage,MIN(t) AS t FROM attempts WHERE username=? AND passed=1 GROUP BY stage').bind(u.username)
    ]);
    const [rd, fw] = await db.batch([
      db.prepare('SELECT id,due,tool,skill,problem,submitted,status FROM redrafts WHERE username=? AND due IS NOT NULL').bind(u.username),
      db.prepare("SELECT f.id,f.topic,w.id AS work_id,w.title,w.due,w.status,w.done_at FROM follow f JOIN work w ON w.id=f.work_id WHERE f.username=? AND w.due IS NOT NULL").bind(u.username)
    ]);
    const mine = sc.results.filter(x => { if (x.who === 'all') return true; try { return JSON.parse(x.who).includes(u.username); } catch (e) { return false; } });
    return { items: mine, excused: ex.results, marks: mk.results, passes: at.results, redrafts: rd.results, follows: fw.results };
  },

  async '/sched/save'(db, b) {
    await session(db, b.token, 'teacher');
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 400);
    const stmts = items.map(it => {
      const who = Array.isArray(it.who) && it.who.length ? JSON.stringify(it.who.map(x => str(x, 40))) : 'all';
      return db.prepare(`INSERT INTO sched(id,due,kind,ref,title,detail,marks,who,sort,created) VALUES(?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET due=excluded.due, kind=excluded.kind, ref=excluded.ref, title=excluded.title, detail=excluded.detail,
        marks=excluded.marks, who=excluded.who, sort=excluded.sort`)
        .bind(str(it.id, 200) || ('s-' + b64u(rand(8))), str(it.due, 10), str(it.kind, 12), str(it.ref, 200), str(it.title, 300), str(it.detail, 4000),
          it.marks ? int(it.marks) : null, who, int(it.sort), nowIso());
    });
    for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));
    return { saved: stmts.length };
  },

  async '/sched/delete'(db, b) {
    await session(db, b.token, 'teacher');
    const ids = (Array.isArray(b.ids) ? b.ids : [b.id]).slice(0, 200).map(x => str(x, 200)).filter(Boolean);
    const stmts = [];
    ids.forEach(id => { stmts.push(db.prepare('DELETE FROM sched WHERE id=?').bind(id)); stmts.push(db.prepare('DELETE FROM excuse WHERE sched_id=?').bind(id)); });
    if (stmts.length) await db.batch(stmts);
    return { ok: true };
  },

  async '/sched/excuse'(db, b) {
    await session(db, b.token, 'teacher');
    if (b.on) await db.prepare('INSERT INTO excuse(sched_id,username,note,t) VALUES(?,?,?,?) ON CONFLICT(sched_id,username) DO UPDATE SET note=excluded.note')
      .bind(str(b.id, 200), str(b.username, 40), str(b.note, 300), nowIso()).run();
    else await db.prepare('DELETE FROM excuse WHERE sched_id=? AND username=?').bind(str(b.id, 200), str(b.username, 40)).run();
    return { ok: true };
  },

  /* import of results: marked papers loaded on the dashboard (replace=true updates a re-loaded file) */
  async '/import'(db, b) {
    await session(db, b.token, 'teacher');
    const users = new Set((await db.prepare('SELECT username FROM users').all()).results.map(r => r.username));
    const stmts = [];
    for (const m of (Array.isArray(b.marks) ? b.marks : []).slice(0, 200)) {
      if (!users.has(m.username) || !m.qid) continue;
      stmts.push(db.prepare((b.replace ? 'INSERT OR REPLACE' : 'INSERT OR IGNORE') + ' INTO marks(qid,username,t,tool,question,mark,level,well,improve,answer) VALUES(?,?,?,?,?,?,?,?,?,?)')
        .bind(str(m.qid, 40), m.username, str(m.t, 40), str(m.tool, 60), str(m.question, 500), str(m.mark, 20), str(m.level, 60), str(m.well, 1200), str(m.improve, 1200), str(m.answer, 12000)));
    }
    for (const a of (Array.isArray(b.attempts) ? b.attempts : []).slice(0, 200)) {
      if (!users.has(a.username) || !a.qid) continue;
      stmts.push(db.prepare('INSERT OR IGNORE INTO attempts(qid,username,t,stage,title,score,total,passed,missed,answer) VALUES(?,?,?,?,?,?,?,?,?,?)')
        .bind(str(a.qid, 40), a.username, str(a.t, 40), int(a.stage), str(a.stageTitle, 200), int(a.score), int(a.total), a.passed ? 1 : 0,
          JSON.stringify((Array.isArray(a.missed) ? a.missed : []).slice(0, 30).map(m => str(m, 300))), str(a.answer, 12000)));
    }
    if (stmts.length) await db.batch(stmts);
    return { saved: stmts.length };
  },

  async '/accounts/create'(db, b) {
    await session(db, b.token, 'teacher');
    const name = str(b.name, 80).trim();
    if (!name) throw new HttpError(400, 'Enter a name.');
    let username;
    for (let i = 0; i < 20; i++) {
      username = newUsername();
      if (!(await db.prepare('SELECT 1 FROM users WHERE username=?').bind(username).first())) break;
    }
    const password = oneTimePassword();
    await db.prepare('INSERT INTO users(username,name,pw,must_change,created) VALUES(?,?,?,1,?)')
      .bind(username, name, await hashPassword(password), nowIso()).run();
    return { username, name, password };
  },

  async '/accounts/reset'(db, b) {
    await session(db, b.token, 'teacher');
    const username = str(b.username, 40);
    const u = await db.prepare('SELECT name FROM users WHERE username=?').bind(username).first();
    if (!u) throw new HttpError(404, 'No account with that username.');
    const password = oneTimePassword();
    await db.batch([
      db.prepare('UPDATE users SET pw=?, must_change=1 WHERE username=?').bind(await hashPassword(password), username),
      db.prepare('DELETE FROM sessions WHERE username=?').bind(username),
      db.prepare('DELETE FROM fails WHERE k=?').bind('u:' + username)
    ]);
    return { username, name: u.name, password };
  },

  async '/accounts/rename'(db, b) {
    await session(db, b.token, 'teacher');
    const name = str(b.name, 80).trim();
    if (!name) throw new HttpError(400, 'Enter a name.');
    await db.prepare('UPDATE users SET name=? WHERE username=?').bind(name, str(b.username, 40)).run();
    return { ok: true };
  },

  async '/accounts/delete'(db, b) {
    await session(db, b.token, 'teacher');
    const u = str(b.username, 40);
    await db.batch(['users', 'sessions', 'store', 'attempts', 'marks', 'blurts', 'work', 'notes', 'excuse', 'redrafts', 'follow', 'visits'].map(t => db.prepare(`DELETE FROM ${t} WHERE username=?`).bind(u)));
    return { ok: true };
  }
};

/* =====================================================================
   Entry point
   ===================================================================== */
function cors(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const h = { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' };
  if (allowed.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}
const json = (data, status, h) => new Response(JSON.stringify(data), { status, headers: Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, h) });

export default {
  async fetch(req, env) {
    const h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    const path = new URL(req.url).pathname.replace(/\/+$/, '') || '/';
    if (req.method === 'GET' && path === '/') return json({ ok: true, service: 'nishkam tracker 7138' }, 200, h);
    const fn = routes[path];
    if (req.method !== 'POST' || !fn) return json({ error: 'Not found' }, 404, h);
    if (!h['Access-Control-Allow-Origin']) return json({ error: 'Not allowed from this site.' }, 403, h);
    try {
      if (!env.DB) throw new HttpError(500, 'The database has not been connected yet.');
      await ensureSchema(env.DB);
      const text = await req.text();
      if (text.length > 1000000) throw new HttpError(413, 'Too much data.');
      let body;
      try { body = JSON.parse(text || '{}'); } catch (e) { throw new HttpError(400, 'Bad request.'); }
      if (!body || typeof body !== 'object') throw new HttpError(400, 'Bad request.');
      return json(await fn(env.DB, body, env), 200, h);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500 && !(e instanceof HttpError)) console.error(e && e.stack || e);
      return json({ error: e instanceof HttpError ? e.message : 'Something went wrong on the server. Try again in a minute.' }, status, h);
    }
  }
};
