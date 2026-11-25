/* =====================================================================
   Teacher tracker: the assessment schedule.
   "This week" snapshot, Friday detentions, the whole season, and
   editing the schedule (add questions, courses or your own question).
   Uses TR (course-tracker.html), EXAMS, SCHED_PLAN and Sched.
   ===================================================================== */
(function(){
"use strict";
const S=window.Sched,$=(s,r)=>(r||document).querySelector(s),$$=(s,r)=>[...(r||document).querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let root=null,view={page:'week',due:null},cacheFor=null,cache=null;

const css=`
.sc-top{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px}
.sc-top .sp{flex:1}
.sc-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;box-shadow:var(--shadow);margin-bottom:20px}
.sc-card h2{font-size:1.3rem;margin-bottom:8px}
.sc-grid{border-collapse:collapse;font-size:.82rem;width:auto}
.sc-grid th,.sc-grid td{padding:5px 6px;border-bottom:1px solid var(--line);text-align:center;white-space:nowrap}
.sc-grid th.q{writing-mode:vertical-rl;transform:rotate(180deg);height:120px;font-weight:600;color:var(--fg);vertical-align:bottom;max-width:40px}
.sc-grid td.l,.sc-grid th.l{text-align:left}
.c{display:inline-block;min-width:26px;padding:3px 4px;border-radius:5px;font:600 .72rem "IBM Plex Mono",monospace;cursor:pointer}
.c.hw{box-shadow:inset 0 0 0 2px #2f6fdb}.c.ty{box-shadow:inset 0 0 0 2px #8a8f98}.c.pz{box-shadow:inset 0 0 0 2px #c0392b}
.act-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px;vertical-align:0}.act-dot.now{background:#1e8e3e}.act-dot.today{background:#2f6fdb}.act-dot.week{background:#b0b4ba}.act-dot.old{background:#c0392b}
.feed{list-style:none;margin:0;padding:0;font-size:.88rem}.feed li{padding:7px 0;border-bottom:1px solid var(--line);display:flex;gap:10px;align-items:baseline}.feed .tm{color:var(--muted);font-size:.8rem;min-width:92px;white-space:nowrap}.feed .who{font-weight:600}
.feed li.v{color:var(--muted)}
.ring{display:inline-block;width:14px;height:14px;border-radius:4px;vertical-align:-2px;margin-right:4px}.ring.hw{box-shadow:inset 0 0 0 2px #2f6fdb}.ring.ty{box-shadow:inset 0 0 0 2px #8a8f98}.ring.pz{box-shadow:inset 0 0 0 2px #c0392b}
.c.done{background:var(--ok-soft);color:var(--ok)}.c.late{background:var(--amber-soft);color:var(--amber)}.c.missing{background:var(--end-soft);color:var(--end)}.c.todo{color:var(--muted);background:var(--bg2)}.c.excused{color:var(--muted);text-decoration:line-through}
.det{list-style:none;padding:0;margin:0;display:grid;gap:8px}
.det li{border-bottom:1px solid var(--line);padding-bottom:8px}
.det .why{color:var(--muted);font-size:.84rem}
.wk-list{display:grid;gap:10px}
.wk-row{border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.wk-row .h{display:flex;gap:10px;flex-wrap:wrap;align-items:baseline}
.wk-row .h b{font-size:1rem}
.it{display:flex;gap:8px;align-items:flex-start;border-top:1px solid var(--line);padding:7px 0;font-size:.88rem}
.it .tx{flex:1}
.it .tx span{color:var(--muted)}
.sc-form{display:grid;gap:12px}
.sc-form label.f{font-size:.8rem;font-weight:600;color:var(--muted);display:block;margin-bottom:4px}
.sc-form .row{display:flex;gap:12px;flex-wrap:wrap}
.sc-form .row>div{flex:1 1 160px}
.sc-form input,.sc-form select,.sc-form textarea{margin:0;width:100%}
.sc-form textarea{border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--fg);padding:9px 11px;font:15px "IBM Plex Sans",sans-serif;min-height:80px}
.chk{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.88rem}
.chk label{display:flex;gap:6px;align-items:center}
.chk input{width:auto}
.lnk{border:0;background:none;color:var(--fg);font:inherit;font-weight:600;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:2px}
.pill{font-size:.78rem;padding:2px 8px;border-radius:999px;background:var(--bg2);color:var(--muted)}
.rd-box{border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-top:10px;font-size:.88rem}
.rd-box .ex{font-style:italic;border-left:3px solid var(--line);padding-left:10px;margin:6px 0;white-space:pre-wrap}
.rd-box .ans{white-space:pre-wrap;background:var(--bg2);border-radius:8px;padding:8px 10px;margin:6px 0}
.vd{font-size:.75rem;font-weight:600;padding:2px 8px;border-radius:999px;white-space:nowrap}
.vd.fixed,.vd.closed{background:var(--ok-soft);color:var(--ok)}.vd.partly,.vd.set,.vd.open{background:var(--amber-soft);color:var(--amber)}.vd.notyet,.vd.flag,.vd.missed{background:var(--end-soft);color:var(--end)}.vd.none{background:var(--bg2);color:var(--muted)}
.gp{display:grid;gap:4px}
.gp div{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
.gp .src,.src{color:var(--muted);font-size:.8rem}
.fu-list{display:grid;gap:0}
.fu-st{border-top:1px solid var(--line);padding:12px 0}
.fu-h{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:6px}
.fu-gap{display:flex;gap:6px 14px;flex-wrap:wrap;align-items:center;padding:6px 0 6px 12px;border-left:3px solid var(--line);margin:4px 0}
.fu-t{font-size:.92rem;min-width:220px;flex:1 1 260px}
.fu-m{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.fu-send{padding:4px 12px;font-size:.82rem}
@media print{body *{visibility:hidden}#detPrint,#detPrint *{visibility:visible}#detPrint{position:absolute;left:0;top:0;width:100%}}`;

/* ---------- data ---------- */
function data(){
  const d=TR.data;if(cacheFor===d&&cache)return cache;
  const items=(d.sched||[]).slice().sort((a,b)=>a.due.localeCompare(b.due)||(a.sort||0)-(b.sort||0));
  const students=(d.accounts||[]).slice().sort((a,b)=>a.name.localeCompare(b.name)).map(a=>{
    const u=a.username;
    const ex=(d.excuses||[]).filter(x=>x.username===u).map(x=>x.sched_id);
    const ctx=S.ctxFrom((d.marks||[]).filter(m=>m.exam===u),(d.rows||[]).filter(r=>r.exam===u),(d.store||{})[u]||{},ex);
    const mine=items.filter(it=>it.who==='all'||(Array.isArray(it.who)&&it.who.includes(u)));
    const st={};mine.forEach(it=>{st[it.id]=S.status(it,ctx);});
    const rd=(d.redrafts||[]).filter(r=>r.exam===u);
    const exs=new Set(ex);
    const rdSt={};rd.forEach(r=>{if(r.due)rdSt[r.id]=rdStatus(r,exs);});
    return {u,name:a.name,first:a.name.split(' ')[0],items:mine,st,rd,rdSt};
  });
  const cnt={};students.forEach(s=>{cnt[s.first]=(cnt[s.first]||0)+1;});students.forEach(s=>{if(cnt[s.first]>1)s.first=s.name;});
  cacheFor=d;cache={items,students};return cache;
}
/* a redraft counts for its deadline once it has been handed in, whatever the verdict */
function rdStatus(r,excused){
  if(excused&&excused.has('rd:'+r.id))return {s:'excused'};
  const dl=S.deadline(r.due),t=r.submitted?Date.parse(r.submitted):null;
  if(t)return {s:t>dl?'late':'done',t};
  return {s:Date.now()>dl?'missing':'todo'};
}
const RDV={fixed:'Fixed',partly:'Partly fixed',notyet:'Not fixed yet',flag:'Not fixed after two tries',set:'Not done yet'};
const rdSkill=r=>(S.RD_SKILL&&S.RD_SKILL[r.skill])||'where marks were lost';
const WORST=['missing','todo','late','done','excused'];
const shortLabel=it=>{if(it.kind==='exam'){const e=S.EX[it.ref];return e?`P${e.paper} ${e.year==='2020N'?'N20':e.year.slice(2)} Q${e.num} (${e.marks})`:it.ref;}
  if(it.kind==='choice'){const os=String(it.ref).split(',').map(id=>S.EX[id]).filter(Boolean);if(!os.length)return it.ref;const e=os[0];return `P${e.paper} ${e.year==='2020N'?'N20':e.year.slice(2)} Q${os.map(o=>o.num).join('/')} (${e.marks})`;}
  if(it.kind==='course')return (S.COURSES[it.ref]||[0,it.title])[1].replace(' course','');
  if(it.kind==='quiz')return /^kq/.test(it.ref)?'Quiz':'Calcs';
  if(it.kind==='drill')return 'Data drill';
  if(/^hw/.test(it.id))return `${it.marks}m ${String(it.detail||'').replace(/ (Ltd|plc)$/,'').split(' ')[0]}`;return `Set Q (${it.marks})`;};
const LETTER={done:'✓',late:'L',missing:'✗',todo:'·',excused:'E'};
const TITLE={done:'Done on time',late:'Done after the deadline',missing:'Not done by the deadline',todo:'Not done yet',excused:'Excused'};


/* ---------- handwritten or typed ---------- */
function parseHow(m){try{return m&&m.how?JSON.parse(m.how):null;}catch(e){return null;}}
function howKind(h){if(!h)return '';if(h.m==='photo')return 'hw';const tot=(h.k||0)+(h.p||0);
  if(((h.p||0)>=300&&(h.p||0)>=tot*0.5)||(h.big||0)>=500)return 'pz';return 'ty';}
function howText(h){if(!h)return '';if(h.m==='photo')return `Handwritten: ${h.pg} photo page${h.pg>1?'s':''}`;
  const tot=(h.k||0)+(h.p||0),pc=tot?Math.round(100*(h.p||0)/tot):0;
  return `Typed: ${h.w} words, ${pc}% pasted${h.big?` (largest paste ${h.big} characters)`:''}, about ${Math.max(1,Math.round((h.s||0)/60))} min of typing`;}
const RANK={pz:3,ty:2,hw:1,'':0};
function howOf(u,it){const refs=it.kind==='question'?[it.id]:refsOf(it);if(!refs.length)return null;
  const hs=(TR.data.marks||[]).filter(m=>m.exam===u&&m.ref&&refs.includes(m.ref)).map(parseHow).filter(Boolean);
  if(!hs.length)return null;hs.sort((a,b)=>RANK[howKind(b)]-RANK[howKind(a)]);return {k:howKind(hs[0]),t:hs.map(howText).join(' | ')};}
function howCard(students){
  const rows=students.map(s=>{const hs=(TR.data.marks||[]).filter(m=>m.exam===s.u).map(parseHow).filter(Boolean);
    const c={hw:0,ty:0,pz:0};hs.forEach(h=>c[howKind(h)]++);return {s,c,n:hs.length};});
  return `<div class="sc-card"><h2>Handwritten or typed</h2><p class="muted" style="margin:0 0 10px;font-size:.85rem">Answers marked with the essay tools since this started being recorded. "Mostly pasted" means at least half of a typed answer was pasted in, or one paste of 500 characters or more.</p>
  <div class="tablewrap"><table><thead><tr><th class="l">Student</th><th><span class="ring hw"></span>Photos</th><th><span class="ring ty"></span>Typed</th><th><span class="ring pz"></span>Mostly pasted</th></tr></thead><tbody>
  ${rows.sort((a,b)=>b.c.pz-a.c.pz||b.c.ty-a.c.ty||a.s.name.localeCompare(b.s.name)).map(x=>`<tr><td class="l">${esc(x.s.name)}</td><td>${x.c.hw}</td><td>${x.c.ty}</td><td>${x.c.pz?`<span class="cell a">${x.c.pz}</span>`:0}</td></tr>`).join('')}
  </tbody></table></div></div>`;}


/* ---------- live activity ---------- */
function ago(t){const m=Math.round((Date.now()-t)/60000);if(m<1)return 'just now';if(m<60)return m+' min ago';const h=Math.round(m/60);if(h<24)return h+' hour'+(h>1?'s':'')+' ago';const d=Math.round(h/24);return d+' day'+(d>1?'s':'')+' ago';}
function when(t){const d=new Date(t),today=new Date();const same=d.toDateString()===today.toDateString();
  return same?d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):d.toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}
function events(){
  const d=TR.data,ev=[],T=x=>typeof x==='number'?x:Date.parse(x);
  const setName=r=>{const m=/^(kq|calc)-(\d+)/.exec(r);return m?(m[1]==='kq'?'knowledge quiz':'calculations')+' (week '+(+m[2])+')':r;};
  (d.marks||[]).forEach(m=>{const h=parseHow(m),k=howKind(h);ev.push({u:m.exam,t:T(m.t),what:`had an answer marked in the ${m.tool}: ${m.mark||m.level}`+(k==='hw'?' (handwritten)':k==='pz'?' (typed, mostly pasted)':k==='ty'?' (typed)':''),detail:m.question,k:'mark'});});
  (d.rows||[]).forEach(r=>ev.push({u:r.exam,t:T(r.t),what:`${r.passed?'passed':'had a go at'} ${r.stageTitle||'a course stage'}${r.total?` (${r.score}/${r.total})`:''}`,k:'course'}));
  (d.blurts||[]).forEach(b=>ev.push({u:b.exam,t:T(b.t),what:`did a ${b.kind==='rapid'?'rapid recall':'blurt'}${b.topic?' on '+b.topic:''}${b.total?` (${b.got}/${b.total})`:''}`,k:'blurt'}));
  Object.entries(d.storeT||{}).forEach(([u,ks])=>Object.entries(ks).forEach(([key,t])=>{const v=((d.store||{})[u]||{})[key]||{};
    if(/^quiz:/.test(key))ev.push({u,t:T(t),what:(v.done?`finished ${setName(key.slice(5))}: ${v.score}/${v.total}`:`started ${setName(key.slice(5))}`),k:'quiz'});
    else if(/^drill:/.test(key)){const it=(d.sched||[]).find(i=>i.kind==='drill'&&i.ref===key.slice(6));const nmd=it?it.title:key.slice(6);
      ev.push({u,t:T(t),what:(v.done?`finished the ${nmd}: ${v.score}/${v.total} in ${Math.max(1,Math.round((v.secs||0)/60))} min`:`started the ${nmd}`),k:'drill'});}}));
  (d.work||[]).forEach(w=>{if(w.done_at)ev.push({u:w.exam,t:T(w.done_at),what:`finished set work: ${w.title||'work'}`,k:'work'});});
  (d.visits||[]).forEach(v=>ev.push({u:v.exam,t:T(v.t),what:`opened ${v.title||v.page}`,k:'visit'}));
  (d.redrafts||[]).forEach(r=>{if(r.done_at)ev.push({u:r.exam,t:T(r.done_at),what:`redrafted ${rdSkill(r)} (${r.tool||'essay'}): ${(RDV[r.status]||RDV[r.verdict]||'').toLowerCase()}`,detail:r.feedback,k:'redraft'});});
  (d.follows||[]).forEach(f=>ev.push({u:f.exam,t:T(f.created),what:`was sent a follow-up on ${((window.Analysis&&Analysis.TOP[f.topic])||{}).title||f.topic}`,detail:f.why,k:'follow'}));
  return ev.filter(e=>e.t&&!isNaN(e.t)).sort((a,b)=>b.t-a.t);
}
let actFilter={u:'',visits:true,n:40};
function activityCard(students){
  const ev=events(),now=Date.now(),day=new Date();day.setHours(0,0,0,0);
  const rows=students.map(s=>{const mine=ev.filter(e=>e.u===s.u);const acc=(TR.data.accounts||[]).find(a=>a.username===s.u)||{};
    const last=Math.max(mine.length?mine[0].t:0,acc.lastSeen?Date.parse(acc.lastSeen):0);
    const work=mine.filter(e=>e.k!=='visit');
    return {s,last,today:mine.filter(e=>e.t>=day.getTime()).length,week:work.filter(e=>e.t>=now-7*86400000).length,lastWhat:work[0]};});
  rows.sort((a,b)=>b.last-a.last);
  const dot=t=>!t?'old':now-t<3600000?'now':t>=day.getTime()?'today':now-t<7*86400000?'week':'old';
  return `<div class="sc-card" id="actCard"><h2>Live activity</h2><p class="muted" style="margin:0 0 10px;font-size:.85rem">Everything students do on the site while signed in, not just the homework. Press Refresh at the top to bring it up to date.</p>
  <div class="tablewrap"><table><thead><tr><th class="l">Student</th><th class="l">Last on the site</th><th>Actions today</th><th>Work done in the last 7 days</th><th class="l">Last piece of work</th></tr></thead><tbody>
  ${rows.map(x=>`<tr><td class="l"><button class="lnk" data-act="${esc(x.s.u)}">${esc(x.s.name)}</button></td><td class="l"><span class="act-dot ${dot(x.last)}"></span>${x.last?esc(ago(x.last)):'<span class="muted">never</span>'}</td><td>${x.today}</td><td>${x.week?x.week:'<span class="cell a">0</span>'}</td><td class="l muted" style="white-space:normal;max-width:380px">${x.lastWhat?esc(x.lastWhat.what)+' · '+esc(when(x.lastWhat.t)):'nothing yet'}</td></tr>`).join('')}
  </tbody></table></div>
  <div class="legend"><span><span class="act-dot now"></span>in the last hour</span><span><span class="act-dot today"></span>today</span><span><span class="act-dot week"></span>this week</span><span><span class="act-dot old"></span>not for over a week</span></div>
  <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin:16px 0 6px"><select id="actWho" style="width:auto"><option value="">Everyone</option>${students.map(s=>`<option value="${esc(s.u)}" ${actFilter.u===s.u?'selected':''}>${esc(s.name)}</option>`).join('')}</select>
  <label style="display:flex;gap:6px;align-items:center;font-size:.88rem"><input type="checkbox" id="actVis" style="width:auto" ${actFilter.visits?'checked':''}> Show pages opened</label></div>
  <ul class="feed" id="actFeed">${feedHtml(ev)}</ul></div>`;
}
function feedHtml(ev){
  const nm=u=>((TR.data.roster||{})[u])||u;
  const list=ev.filter(e=>(!actFilter.u||e.u===actFilter.u)&&(actFilter.visits||e.k!=='visit'));
  if(!list.length)return '<li class="muted">Nothing yet.</li>';
  return list.slice(0,actFilter.n).map(e=>`<li class="${e.k==='visit'?'v':''}"><span class="tm">${esc(when(e.t))}</span><span><span class="who">${esc(nm(e.u))}</span> ${esc(e.what)}${e.detail?`<span class="muted">: ${esc(String(e.detail).slice(0,90))}${String(e.detail).length>90?'…':''}</span>`:''}</span></li>`).join('')
    +(list.length>actFilter.n?`<li><button class="lnk" id="actMore">Show more (${list.length-actFilter.n} older)</button></li>`:'');
}
function wireActivity(){
  const f=$('#actFeed');if(!f)return;const ev=events();
  const redraw=()=>{f.innerHTML=feedHtml(ev);const m=$('#actMore');if(m)m.onclick=()=>{actFilter.n+=60;redraw();};};
  $('#actWho').onchange=e=>{actFilter.u=e.target.value;actFilter.n=40;redraw();};
  $('#actVis').onchange=e=>{actFilter.visits=e.target.checked;redraw();};
  document.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{actFilter.u=b.dataset.act;actFilter.n=40;$('#actWho').value=actFilter.u;redraw();f.scrollIntoView({block:'start',behavior:'smooth'});});
  redraw();
}

/* ---------- this week ---------- */
function renderWeek(){
  const {items,students}=data();
  if(!autoTried&&items.length&&(()=>{const m=planChanges(items);return m.old.length||m.changed.length||m.missing.some(i=>/^dr-/.test(i.id));})()){autoUpdate(items);return;}
  let planMsg='';try{planMsg=sessionStorage.getItem('n8_plan_msg')||'';}catch(e){}
  if(!items.length){root.innerHTML=`<div class="sc-card"><h2>No schedule yet</h2><p class="muted">Load the plan. Each week has two 6-mark, two 9-mark and two 15-mark questions on topics already taught, 10 calculations with questions on using the answers, a data drill and a 20-question knowledge quiz. Everything is due on Wednesday at 11:59pm and nothing is set in KAT weeks. More weeks are added to the plan as each topic is taught.</p><button class="btn" id="scLoad">Load the plan</button> <span class="muted" id="scMsg"></span></div>`;
    $('#scLoad').onclick=loadPlan;return;}
  const dues=S.weeks(items).filter(d=>items.some(i=>i.due===d));
  const due=view.due&&dues.includes(view.due)?view.due:(S.currentDue(items)||dues[0]);
  const wk=items.filter(i=>i.due===due),info=S.weekInfo(due),idx=dues.indexOf(due);
  const last=S.lastDue(items);
  const now=Date.now(),passed=S.deadline(due)<now;
  /* detentions for the most recent deadline */
  const det=last?students.map(s=>({s,miss:s.items.filter(i=>i.due===last&&s.st[i.id].s==='missing').map(shortLabel)
    .concat(s.rd.filter(r=>r.due===last&&s.rdSt[r.id]&&s.rdSt[r.id].s==='missing').map(r=>'Redraft: '+rdSkill(r)))})).filter(x=>x.miss.length):[];
  const rdWeek=s=>s.rd.filter(r=>r.due===due);
  /* season totals up to now */
  const tot=students.map(s=>{const past=s.items.filter(i=>S.deadline(i.due)<now);const c={done:0,late:0,missing:0,excused:0};past.forEach(i=>{c[s.st[i.id].s]=(c[s.st[i.id].s]||0)+1;});
    const pr=s.rd.filter(r=>r.due&&S.deadline(r.due)<now);pr.forEach(r=>{const k=s.rdSt[r.id].s;c[k]=(c[k]||0)+1;});
    const weeksMissed=new Set(past.filter(i=>s.st[i.id].s==='missing').map(i=>i.due).concat(pr.filter(r=>s.rdSt[r.id].s==='missing').map(r=>r.due))).size;return {s,c,past:past.length+pr.length,weeksMissed};});
  root.innerHTML=`
  <div class="sc-top"><button class="btn ghost" id="scPrev" ${idx<=0?'disabled':''}>Previous week</button><button class="btn ghost" id="scNext" ${idx>=dues.length-1?'disabled':''}>Next week</button>
    <button class="btn ghost" id="scNow">This week</button><span class="sp"></span><button class="btn" id="scEdit">Edit the schedule</button></div>
  <div class="stats">
    <div class="card stat"><b>${esc(S.fmtDay(due))}</b><span>deadline, 11:59pm · week ${idx+1} of ${dues.length}</span></div>
    <div class="card stat"><b>${wk.length}</b><span>pieces of work this week</span></div>
    <div class="card stat"><b>${students.filter(s=>wk.every(i=>!s.st[i.id]||['done','late','excused'].includes(s.st[i.id].s))&&rdWeek(s).every(r=>['done','late','excused'].includes(s.rdSt[r.id].s))).length} / ${students.length}</b><span>students with everything done</span></div>
    <div class="card stat"><b>${det.length}</b><span>detentions from the last deadline${last?` (${esc(S.fmtDay(last))})`:''}</span></div>
  </div>
  ${planMsg?`<div class="sc-card" style="padding:12px 16px"><p style="margin:0">${esc(planMsg)} <button class="lnk" id="pmX" style="font-weight:400">Hide</button></p></div>`:''}
  ${info.note?`<p class="muted" style="margin:-6px 0 14px">${esc(info.note)}</p>`:''}
  <div class="sc-card" id="detPrint"><h2>Friday detentions${last?`: deadline ${esc(S.fmtDay(last))}`:''}</h2>
    ${!last?'<p class="muted">No deadline has passed yet.</p>':det.length?`<ul class="det">${det.map(x=>`<li><b>${esc(x.s.name)}</b> <span class="why">${x.miss.length} missing</span><div class="why">${x.miss.map(esc).join(' · ')}</div></li>`).join('')}</ul>`:'<p class="muted">Everyone met the deadline.</p>'}
    ${det.length?`<div style="margin-top:12px;display:flex;gap:10px"><button class="btn ghost" id="detCopy">Copy the list</button><button class="btn ghost" id="detPrintBtn">Print</button></div>`:''}</div>
  <div class="sc-card"><h2>Week ${idx+1}: due ${esc(S.fmtDay(due))}</h2><p class="muted" style="margin:0 0 10px;font-size:.85rem">Click a cell to excuse a student (for example if they were absent), or click again to undo.${passed?'':' The deadline has not passed yet.'}</p>
    <div class="tablewrap"><table class="sc-grid"><thead><tr><th class="l">Student</th><th>Done</th>${wk.map(i=>`<th class="q" title="${esc(S.describe(i).sub||'')}">${esc(shortLabel(i))}</th>`).join('')}<th class="q" title="The part of a marked answer where the student lost the most marks. Up to two count each week.">Redrafts</th></tr></thead><tbody>
    ${students.map(s=>{const mine=wk.filter(i=>s.st[i.id]);const rw=rdWeek(s);
      const dn=mine.filter(i=>['done','late','excused'].includes(s.st[i.id].s)).length+rw.filter(r=>['done','late','excused'].includes(s.rdSt[r.id].s)).length;
      return `<tr><td class="l">${esc(s.name)}</td><td>${dn}/${mine.length+rw.length}</td>${wk.map(i=>{const x=s.st[i.id];if(!x)return '<td class="muted">–</td>';
        const qz=(i.kind==='quiz'||i.kind==='drill')?((TR.data.store||{})[s.u]||{})[i.kind+':'+i.ref]:null,sc=qz&&qz.total?` · ${qz.score}/${qz.total} right${qz.secs?` in ${Math.round(qz.secs/60)} min`:' first time'}`:'';
        const hw=(x.s==='done'||x.s==='late')?howOf(s.u,i):null;
        return `<td><span class="c ${x.s}${hw&&hw.k?' '+hw.k:''}" data-u="${esc(s.u)}" data-i="${esc(i.id)}" title="${TITLE[x.s]}${x.t?' · '+new Date(x.t).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):''}${sc}${hw?' · '+esc(hw.t):''}">${qz&&qz.done&&qz.total?qz.score:LETTER[x.s]}</span></td>`;}).join('')}${rdCell(s,rw)}</tr>`;}).join('')}
    </tbody></table></div>
    <div id="rdDetail"></div>
    <div class="legend"><span><span class="c done">✓</span> on time</span><span><span class="c late">L</span> late</span><span><span class="c missing">✗</span> missed</span><span><span class="c todo">·</span> not yet</span><span><span class="c excused">E</span> excused</span></div>
    ${(()=>{const dr=wk.filter(i=>i.kind==='drill');const all=items.filter(i=>i.kind==='drill');if(!all.length)return '';
      return `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:14px 0 4px;font-size:.88rem"><b>Try the drills yourself:</b>${dr.map(i=>`<button class="btn ghost" data-pv="${esc(i.ref)}" style="padding:5px 12px">${esc(shortLabel(i))} this week</button>`).join('')}
      <select id="pvAll" style="width:auto"><option value="">Any drill...</option>${all.map(i=>`<option value="${esc(i.ref)}">${esc(S.fmtDay(i.due))}: ${esc(i.title)}</option>`).join('')}</select><span class="muted">Opens in a new tab. Nothing is saved.</span></div>`;})()}
    <div class="legend"><span><span class="ring hw"></span>handwritten (photos)</span><span><span class="ring ty"></span>typed</span><span><span class="ring pz"></span>typed, mostly pasted</span><span class="muted">Hover over a cell for the details.</span></div></div>
  ${activityCard(students)}
  ${followCard(students)}
  ${howCard(students)}
  <div class="sc-card"><h2>The season so far</h2><p class="muted" style="margin:0 0 10px;font-size:.85rem">Every deadline that has passed.</p>
    <div class="tablewrap"><table><thead><tr><th class="l">Student</th><th>On time</th><th>Late</th><th>Missed</th><th>Excused</th><th>Weeks with a detention</th></tr></thead><tbody>
    ${tot.sort((a,b)=>b.c.missing-a.c.missing||a.s.name.localeCompare(b.s.name)).map(x=>`<tr><td class="l">${esc(x.s.name)}</td><td>${x.c.done}</td><td>${x.c.late}</td><td>${x.c.missing?`<span class="cell a">${x.c.missing}</span>`:0}</td><td>${x.c.excused}</td><td>${x.weeksMissed}</td></tr>`).join('')}
    </tbody></table></div></div>
  ${coursesCard(items,students)}`;
  wireActivity();
  const pv=ref=>{if(!ref)return;try{localStorage.setItem('n8_teacher_preview',JSON.stringify({token:TR.token,at:Date.now()}));}catch(e){}window.open('drill.html?d='+encodeURIComponent(ref)+'&preview=1','_blank');};
  $$('[data-rd]',root).forEach(el=>el.onclick=()=>{rdOpen={u:el.dataset.rd,due};showRd(students);});
  wireFollow(students);
  if(rdOpen&&rdOpen.due===due)showRd(students);
  document.querySelectorAll('[data-pv]').forEach(b=>b.onclick=()=>pv(b.dataset.pv));
  const pa=$('#pvAll');if(pa)pa.onchange=()=>{pv(pa.value);pa.value='';};
  const px=$('#pmX');if(px)px.onclick=()=>{try{sessionStorage.removeItem('n8_plan_msg');}catch(e){}render();};
  $('#scPrev').onclick=()=>{view.due=dues[idx-1];render();};
  $('#scNext').onclick=()=>{view.due=dues[idx+1];render();};
  $('#scNow').onclick=()=>{view.due=null;render();};
  $('#scEdit').onclick=()=>{view={page:'edit',due};render();scrollTo({top:0});};
  const txt=()=>`Detentions - deadline ${S.fmtDay(last)}\n`+det.map(x=>`${x.s.name}: ${x.miss.join(', ')}`).join('\n');
  const c=$('#detCopy');if(c)c.onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(txt());c.textContent='Copied';};
  const p=$('#detPrintBtn');if(p)p.onclick=()=>window.print();
  $$('.c[data-i]',root).forEach(el=>el.onclick=async()=>{
    const u=el.dataset.u,id=el.dataset.i,on=!el.classList.contains('excused');
    let note='';if(on){note=prompt('Excuse this student from this piece of work? Add a note if you like (e.g. absent).','Absent');if(note===null)return;}
    try{await TR.api('/sched/excuse',{token:TR.token,id,username:u,on,note});await TR.reload();}catch(e){alert(e.message);}
  });
}
/* ---------- redrafts in the week grid ---------- */
let rdOpen=null,fuOpen=null;
function rdCell(s,rw){
  if(!rw.length)return '<td class="muted">–</td>';
  const sts=rw.map(r=>s.rdSt[r.id].s),worst=WORST.find(k=>sts.includes(k))||'todo';
  const dn=sts.filter(k=>k==='done'||k==='late'||k==='excused').length;
  const vs=rw.filter(r=>r.verdict).map(r=>RDV[r.status]||RDV[r.verdict]).join(', ');
  return `<td><span class="c ${worst}" data-rd="${esc(s.u)}" title="${dn} of ${rw.length} handed in${vs?' · '+esc(vs):''}">${dn}/${rw.length}</span></td>`;
}
function rdBox(r,st){
  return `<div class="rd-box"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:baseline"><b>${esc(rdSkill(r).replace(/^./,c=>c.toUpperCase()))}</b><span class="muted">${esc(r.tool||'')} ${esc(r.mark||'')} · marked ${esc(new Date(r.created).toLocaleDateString('en-GB',{day:'numeric',month:'short'}))}${r.due?' · due '+esc(S.fmtDay(r.due)):' · optional'}</span>
    <span style="flex:1"></span>${st?`<span class="c ${st.s}">${LETTER[st.s]}</span>`:''}${r.verdict?`<span class="vd ${esc(r.status)}">${esc(RDV[r.status]||RDV[r.verdict])}</span>`:''}</div>
    <div class="muted" style="margin-top:4px">${esc(String(r.question||'').slice(0,200))}</div>
    ${r.excerpt?`<div class="ex">${esc(r.excerpt)}</div>`:''}<div><b>Lost marks because:</b> ${esc(r.problem||'')}</div>
    ${r.answer?`<div style="margin-top:6px"><b>Redraft</b> (try ${r.tries}${r.how&&/photo/.test(r.how)?', handwritten photo':''})</div><div class="ans">${esc(r.answer)}</div>`:''}
    ${r.feedback?`<div><b>Check:</b> ${esc(r.feedback)}</div>`:''}
    ${r.due?`<div style="margin-top:8px"><button class="btn ghost" data-rdx="${esc(r.id)}" data-on="${st&&st.s==='excused'?'0':'1'}" style="padding:4px 12px">${st&&st.s==='excused'?'Undo excuse':'Excuse'}</button></div>`:''}</div>`;
}
function showRd(students){
  const box=$('#rdDetail');if(!box||!rdOpen)return;
  const s=students.find(x=>x.u===rdOpen.u);if(!s){box.innerHTML='';return;}
  const rw=s.rd.filter(r=>r.due===rdOpen.due),extra=s.rd.filter(r=>!r.due&&r.created>=(rw[0]?rw[0].created.slice(0,10):'')).slice(0,3);
  box.innerHTML=`<div style="margin-top:16px;display:flex;gap:10px;align-items:baseline"><h3 style="margin:0;font-size:1.05rem">${esc(s.name)}: redrafts due ${esc(S.fmtDay(rdOpen.due))}</h3><span style="flex:1"></span><button class="lnk" id="rdClose">Close</button></div>
    ${rw.map(r=>rdBox(r,s.rdSt[r.id])).join('')}${extra.length?`<p class="muted" style="margin:12px 0 0;font-size:.85rem">Optional ones from the same week (not counted for the deadline):</p>${extra.map(r=>rdBox(r,null)).join('')}`:''}`;
  $('#rdClose').onclick=()=>{rdOpen=null;box.innerHTML='';};
  $$('[data-rdx]',box).forEach(b=>b.onclick=async()=>{const on=b.dataset.on==='1';let note='';
    if(on){note=prompt('Excuse this redraft? Add a note if you like (e.g. absent).','Absent');if(note===null)return;}
    try{await TR.api('/sched/excuse',{token:TR.token,id:'rd:'+b.dataset.rdx,username:s.u,on,note});await TR.reload();}catch(e){alert(e.message);}});
  box.scrollIntoView({block:'nearest',behavior:'smooth'});
}

/* ---------- gaps and follow-up ---------- */
let fuCacheFor=null,fuCache=null;
function followData(students){
  const d=TR.data;if(fuCacheFor===d&&fuCache)return fuCache;
  const A=window.Analysis,workById=Object.fromEntries((d.work||[]).map(w=>[w.id,w]));
  fuCache=students.map(s=>{
    const u=s.u;
    const dd={store:(d.store||{})[u]||{},marks:(d.marks||[]).filter(m=>m.exam===u),attempts:(d.rows||[]).filter(r=>r.exam===u),
      work:(d.work||[]).filter(w=>w.exam===u),blurts:(d.blurts||[]).filter(b=>b.exam===u),redrafts:s.rd};
    const a=A?A.analyse(dd):{gaps:[],ev:[]};
    const fus=(d.follows||[]).filter(f=>f.exam===u).map(f=>Object.assign({},f,{work:workById[f.work_id],state:A?A.followState(f,workById[f.work_id],a.ev):{s:'set',label:'Set'}}));
    const need=A?A.needsWork(a):[];
    const done=s.rd.filter(r=>r.verdict),c={fixed:0,partly:0,notyet:0};done.forEach(r=>{const k=r.status==='flag'?'notyet':r.verdict;c[k]=(c[k]||0)+1;});
    const flags=s.rd.filter(r=>r.status==='flag');
    const rf=Object.values(dd.store.rfgate||{}).filter(x=>x&&x.t);
    return {s,a,need,fus,c,flags,done:done.length,rf,dd};
  });
  fuCacheFor=d;return fuCache;
}
function followCard(students){
  if(!window.Analysis)return '';
  const A=window.Analysis,rows=followData(students);
  const latest=(x,topic)=>x.fus.find(f=>f.topic===topic);
  const att=x=>(x.flags.length?3:0)+x.need.filter(g=>{const f=latest(x,g.id);return !f||f.state.s==='open'||f.state.s==='missed';}).length;
  const list=rows.slice().sort((a,b)=>att(b)-att(a)||a.s.name.localeCompare(b.s.name));
  const gapRow=(x,g)=>{const f=latest(x,g.id),openNow=f&&f.state.s==='set';
    const chip=f?`<span class="vd ${esc(f.state.s)}">${esc('Follow-up '+f.state.label.toLowerCase()+(f.state.score!=null?` (${Math.round(f.state.score*100)}%)`:''))}</span>`:'<span class="vd none">No follow-up yet</span>';
    return `<div class="fu-gap"><div class="fu-t">${esc(g.ref+' '+g.title)}</div><div class="fu-m"><span class="src">${Math.round(g.score*100)}% right · ${esc(A.kindsText(g))}</span>${chip}
      ${openNow?'':`<button class="btn ghost fu-send" data-send="${esc(x.s.u)}|${esc(g.id)}">${f?'Send again':'Send now'}</button>`}</div></div>`;};
  return `<div class="sc-card" id="fuCard"><h2>Gaps and follow-up</h2><p class="muted" style="margin:0 0 12px;font-size:.85rem">Each student is judged on their own work. A topic is listed when the evidence shows a real gap: it shows up in two different kinds of work, or there is enough from one kind and most of it is wrong. Every gap gets a follow-up automatically (a refresher or recap, then 3 or 4 checked questions), so students with more gaps get more. Use <b>Send now</b> to send one straight away. Closed means the follow-up was at least 75% right and nothing since has gone wrong on that topic.</p>
  <div class="fu-list">${list.map(x=>{const open=fuOpen===x.s.u,unsent=x.need.filter(g=>{const f=latest(x,g.id);return !f||f.state.s!=='set';});
    return `<div class="fu-st"><div class="fu-h"><button class="lnk" data-fu="${esc(x.s.u)}">${esc(x.s.name)}</button>
      <span class="src">Redrafts: ${x.done?`${x.c.fixed} fixed, ${x.c.partly} partly, ${x.c.notyet?`<span class="cell a">${x.c.notyet} not fixed</span>`:'0 not fixed'}`:'none yet'}</span><span style="flex:1"></span>
      ${unsent.length>1?`<button class="btn ghost fu-send" data-sendall="${esc(x.s.u)}">Send all ${unsent.length}</button>`:''}</div>
      ${x.need.length?x.need.map(g=>gapRow(x,g)).join(''):'<p class="muted" style="margin:6px 0 0;font-size:.88rem">No gaps that need a follow-up at the moment.</p>'}
      ${open?followHistory(x):''}</div>`;}).join('')}</div>
  <p class="muted" style="font-size:.82rem;margin:10px 0 0">Automatic follow-ups go out when the student next opens the home page or their schedule. They are not counted for detentions.</p></div>`;
}
function followHistory(x){
  const A=window.Analysis;
  const fus=x.fus.map(f=>`<li>${esc(new Date(f.created).toLocaleDateString('en-GB',{day:'numeric',month:'short'}))}: ${esc(((A.TOP[f.topic]||{}).ref||f.topic)+' '+((A.TOP[f.topic]||{}).title||''))} <span class="vd ${esc(f.state.s)}">${esc(f.state.label)}</span>
    <span class="muted">${f.work&&f.work.status==='done'?`${f.work.score}/${f.work.total} right`:''}${f.state.later!=null?` · later work on this topic ${Math.round(f.state.later*100)}%`:''}${f.why?' · '+esc(f.why):''}</span></li>`).join('');
  const rf=x.rf.sort((a,b)=>String(b.t).localeCompare(String(a.t))).slice(0,6).map(r=>`<li>${esc(new Date(r.t).toLocaleDateString('en-GB',{day:'numeric',month:'short'}))}: refresher on ${esc((r.d||[]).map(k=>window.REFRESH&&REFRESH.DECKS[k]?REFRESH.DECKS[k].title:k).join(', ')||'calculations')}</li>`).join('');
  const fl=x.flags.map(r=>rdBox(r,null)).join('');
  return `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line);font-size:.86rem">
    <b>Follow-ups</b>${fus?`<ul style="margin:4px 0 8px;padding-left:18px">${fus}</ul>`:'<p class="muted" style="margin:4px 0 8px">None yet.</p>'}
    <b>Refreshers finished</b>${rf?`<ul style="margin:4px 0 8px;padding-left:18px">${rf}</ul>`:'<p class="muted" style="margin:4px 0 8px">None recorded.</p>'}
    ${fl?`<b>Redrafts not fixed after two tries</b>${fl}`:''}</div>`;
}
function wireFollow(students){
  const redraw=()=>{const c=$('#fuCard');if(c){c.outerHTML=followCard(students);wireFollow(students);}};
  $$('#fuCard [data-fu]').forEach(el=>el.onclick=()=>{fuOpen=fuOpen===el.dataset.fu?null:el.dataset.fu;redraw();});
  $$('#fuCard [data-rdx]').forEach(b=>b.remove());
  const send=async(u,ids,btn)=>{
    if(!window.FollowGen){alert('The follow-up tools have not loaded. Refresh the page and try again.');return;}
    const x=followData(students).find(r=>r.s.u===u);if(!x)return;
    const all=$$('#fuCard .fu-send');all.forEach(b=>b.disabled=true);
    let ok=0;const errs=[];
    for(const id of ids){const g=x.need.find(n=>n.id===id);if(!g)continue;
      btn.textContent=`Writing and checking${ids.length>1?` (${ok+errs.length+1} of ${ids.length})`:''}...`;
      try{const f=await FollowGen.build(g,x.dd.marks);await TR.api('/follow/send',Object.assign({token:TR.token,username:u},f));ok++;}
      catch(e){errs.push(g.title+': '+e.message);}}
    if(errs.length)alert(`${ok} sent. These could not be sent:\n${errs.join('\n')}`);
    await TR.reload();
  };
  $$('#fuCard [data-send]').forEach(b=>b.onclick=()=>{const [u,id]=b.dataset.send.split('|');send(u,[id],b);});
  $$('#fuCard [data-sendall]').forEach(b=>b.onclick=()=>{const u=b.dataset.sendall,x=followData(students).find(r=>r.s.u===u);if(!x)return;
    const ids=x.need.filter(g=>{const f=x.fus.find(ff=>ff.topic===g.id);return !f||f.state.s!=='set';}).map(g=>g.id);
    if(confirm(`Send ${ids.length} follow-ups to ${x.s.name} now? Each one takes about half a minute to write and check.`))send(u,ids,b);});
}

function coursesCard(items,students){
  const cs=items.filter(i=>i.kind==='course');if(!cs.length)return '';
  return `<div class="sc-card"><h2>Courses</h2><div class="tablewrap"><table class="sc-grid"><thead><tr><th class="l">Student</th>${cs.map(i=>`<th class="q" style="height:150px" title="Due ${esc(S.fmtDay(i.due))}">${esc(shortLabel(i))} (${esc(S.fmtDay(i.due).replace(/^\w+ /,''))})</th>`).join('')}</tr></thead><tbody>
    ${students.map(s=>`<tr><td class="l">${esc(s.name)}</td>${cs.map(i=>{const x=s.st[i.id];return x?`<td><span class="c ${x.s}" title="${TITLE[x.s]}">${LETTER[x.s]}</span></td>`:'<td>–</td>';}).join('')}</tr>`).join('')}</tbody></table></div></div>`;
}

/* ---------- moving to a new version of the plan ---------- */
const fromPlan=id=>/^e-P\d-\d{4}N?-[\d.]+$/.test(id)||/^ch-/.test(id)||/^c-[a-z0-9_]+_v1$/.test(id)||/^qz-/.test(id)||/^dr-/.test(id);
function refsOf(it){return it.kind==='choice'?String(it.ref).split(','):it.kind==='exam'?[it.ref]:[];}
function planChanges(items){
  const planIds=new Set(SCHED_PLAN.items.map(i=>i.id)),have=new Set(items.map(i=>i.id));
  const byId=Object.fromEntries(items.map(i=>[i.id,i]));
  const changed=SCHED_PLAN.items.filter(i=>byId[i.id]&&(byId[i.id].due!==i.due||String(byId[i.id].ref||'')!==String(i.ref||'')||(i.title&&byId[i.id].title!==i.title)));
  return {old:items.filter(i=>fromPlan(i.id)&&!planIds.has(i.id)),missing:SCHED_PLAN.items.filter(i=>!have.has(i.id)),changed};
}
/* Old planned items are removed, except that anyone who has already handed one in keeps it, marked as done. */
async function applyPlan(items){
  const {old}=planChanges(items);const d=TR.data,keep=[],del=[];
  old.forEach(it=>{const refs=refsOf(it);const who=[...new Set((d.marks||[]).filter(m=>m.ref&&refs.includes(m.ref)).map(m=>m.exam))];
    if(who.length)keep.push(Object.assign({},it,{who}));else del.push(it.id);});
  for(let k=0;k<del.length;k+=100)await TR.api('/sched/delete',{token:TR.token,ids:del.slice(k,k+100)});
  const its=SCHED_PLAN.items.map(i=>Object.assign({who:'all'},i)).concat(keep);
  for(let k=0;k<its.length;k+=100)await TR.api('/sched/save',{token:TR.token,items:its.slice(k,k+100)});
  return {kept:keep,removed:del.length};
}
let autoTried=false;
async function autoUpdate(items){
  if(autoTried||!items.length)return false;autoTried=true;
  const m=planChanges(items);if(!m.old.length&&!m.changed.length&&!m.missing.some(i=>/^dr-/.test(i.id)))return false;
  root.innerHTML='<div class="sc-card"><h2>Updating the schedule</h2><p class="muted">Moving to the new weekly plan...</p></div>';
  try{const r=await applyPlan(items);
    try{sessionStorage.setItem('n8_plan_msg',`The schedule has been updated to the latest weekly plan. ${r.kept.length?`${r.kept.length} question${r.kept.length>1?'s':''} already handed in ${r.kept.length>1?'have':'has'} been kept for the students who did ${r.kept.length>1?'them':'it'}, marked as done.`:'Nobody had handed in any of the old questions yet.'}`);}catch(e){}
    await TR.reload();}catch(e){root.innerHTML=`<div class="sc-card"><h2>Could not update the schedule</h2><p class="muted">${esc(e.message)}</p></div>`;}
  return true;
}

/* ---------- editing ---------- */
function renderEdit(){
  const {items,students}=data();
  const dues=S.weeks(items);
  root.innerHTML=`
  <div class="sc-top"><button class="btn ghost" id="edBack">Back to this week</button><span class="sp"></span><button class="btn ghost" id="edPlan">Update to the latest plan</button></div>
  <p class="muted" id="edPlanMsg" style="margin:-8px 0 12px;font-size:.85rem"></p>
  <div class="sc-card"><h2>Add work</h2><div class="sc-form">
    <div class="row"><div><label class="f">Type</label><select id="adKind"><option value="question">My own question</option><option value="course">A course</option></select></div>
      <div><label class="f">Due (Wednesday 11:59pm)</label><select id="adDue">${dues.map(d=>`<option value="${d}" ${d===view.due?'selected':''}>${esc(S.fmtDay(d))}</option>`).join('')}<option value="other">Another date...</option></select></div></div>
    <div id="adExam" hidden><div class="row"><div><label class="f">Paper</label><select id="adPaper"><option value="1">Paper 1</option><option value="2">Paper 2</option><option value="3">Paper 3</option></select></div>
      <div><label class="f">Series</label><select id="adYear"></select></div></div>
      <label class="f" style="margin-top:8px">Question</label><select id="adQ"></select><p class="muted" id="adQtxt" style="font-size:.85rem;margin:6px 0 0"></p></div>
    <div id="adOwn"><label class="f">Question</label><textarea id="adText" placeholder="Write the question as students should see it"></textarea>
      <div class="row" style="margin-top:8px"><div><label class="f">Marks</label><select id="adMarks"><option>6</option><option>9</option><option>15</option></select></div>
      <div><label class="f">Case study or note for students (optional)</label><input type="text" id="adNote" placeholder="e.g. use the case study from Tuesday's lesson"></div></div></div>
    <div id="adCourse" hidden><label class="f">Course</label><select id="adC">${Object.entries(S.COURSES).map(([k,c])=>`<option value="${k}">${esc(c[1])}</option>`).join('')}</select></div>
    <div><label class="f">Who</label><div class="chk"><label><input type="radio" name="adWho" value="all" checked> The whole class</label><label><input type="radio" name="adWho" value="some"> Some students</label></div>
      <div class="chk" id="adStudents" hidden style="margin-top:6px">${students.map(s=>`<label><input type="checkbox" value="${esc(s.u)}"> ${esc(s.name)}</label>`).join('')}</div></div>
    <div><button class="btn" id="adGo">Add to the schedule</button> <span class="muted" id="adMsg"></span></div>
  </div></div>
  <div class="sc-card"><h2>The whole schedule</h2><p class="muted" style="margin:0 0 10px;font-size:.85rem">Change a due date with the date box, or remove an item. Students see changes straight away.</p><div class="wk-list">
  ${dues.filter(d=>items.some(i=>i.due===d)).map((d,n)=>{const xs=items.filter(i=>i.due===d),w=S.weekInfo(d);
    return `<div class="wk-row"><div class="h"><b>Week ${n+1}: due ${esc(S.fmtDay(d))}</b><span class="pill">${xs.length} items</span>${w.note?`<span class="muted" style="font-size:.84rem">${esc(w.note)}</span>`:''}</div>
    ${xs.map(i=>{const ds=S.describe(i);if(ds.choice)ds.sub=ds.choice.map(o=>o.title+': '+o.sub).join('  |  ');return `<div class="it"><div class="tx">${esc(ds.title)}${i.who!=='all'?` <span>· ${Array.isArray(i.who)?i.who.length:0} students</span>`:''}<br><span>${esc(String(ds.sub||'').slice(0,160))}</span></div>
      <input type="date" value="${i.due}" data-move="${esc(i.id)}" style="width:auto;margin:0;padding:4px 6px;font-size:13px"><button class="lnk" data-del="${esc(i.id)}" style="font-weight:400">Remove</button></div>`;}).join('')}</div>`;}).join('')}
  </div></div>`;
  $('#edBack').onclick=()=>{view={page:'week',due:view.due};render();};
  $('#edPlan').onclick=async()=>{
    const m=planChanges(items);
    if(!confirm(`Replace the planned work with the latest plan? ${m.old.length} old planned items will be removed. If a student has already handed in one of them, it stays in that student's schedule, marked as done. Questions and courses you added yourself are kept, and so are students' marks.`))return;
    const b=$('#edPlan');b.disabled=true;$('#edPlanMsg').textContent='Updating...';
    try{await applyPlan(items);await TR.reload();}catch(e){alert(e.message);b.disabled=false;}
  };
  const kind=()=>$('#adKind').value;
  $('#adKind').onchange=()=>{$('#adExam').hidden=kind()!=='exam';$('#adOwn').hidden=kind()!=='question';$('#adCourse').hidden=kind()!=='course';};
  $$('input[name=adWho]').forEach(r=>r.onchange=()=>{$('#adStudents').hidden=$('input[name=adWho]:checked').value!=='some';});
  const years=()=>{const p=+$('#adPaper').value;const ys=[...new Set((window.EXAMS||[]).filter(e=>e.paper===p).map(e=>e.year))];$('#adYear').innerHTML=ys.map(y=>`<option value="${y}">${y==='2020N'?'November 2020':'June '+y}</option>`).join('');qs();};
  const qs=()=>{const p=+$('#adPaper').value,y=$('#adYear').value;$('#adQ').innerHTML=(window.EXAMS||[]).filter(e=>e.paper===p&&e.year===y).map(e=>`<option value="${e.id}">Q${e.num} (${e.marks} marks)${items.some(i=>i.kind==='exam'&&i.ref===e.id)?' - already scheduled':''}</option>`).join('');qt();};
  const qt=()=>{const e=S.EX[$('#adQ').value];$('#adQtxt').textContent=e?e.q:'';};
  $('#adPaper').onchange=years;$('#adYear').onchange=qs;$('#adQ').onchange=qt;years();
  $('#adGo').onclick=async()=>{
    let due=$('#adDue').value;
    if(due==='other'){due=prompt('Due date (YYYY-MM-DD). The deadline is 11:59pm on that day.','');if(!due||!/^\d{4}-\d{2}-\d{2}$/.test(due))return;}
    const who=$('input[name=adWho]:checked').value==='all'?'all':$$('#adStudents input:checked').map(c=>c.value);
    if(who!=='all'&&!who.length){$('#adMsg').textContent='Choose at least one student.';return;}
    const it={due,who,sort:50+items.filter(i=>i.due===due).length};
    if(kind()==='exam'){it.kind='exam';it.ref=$('#adQ').value;it.id='e-'+it.ref+(items.some(i=>i.id==='e-'+it.ref)?'-'+Date.now().toString(36):'');}
    else if(kind()==='course'){it.kind='course';it.ref=$('#adC').value;it.title=S.COURSES[it.ref][1];it.id='c-'+it.ref+'-'+Date.now().toString(36);}
    else{const t=$('#adText').value.trim();if(!t){$('#adMsg').textContent='Write the question first.';return;}it.kind='question';it.title=t;it.marks=+$('#adMarks').value;it.detail=$('#adNote').value.trim();it.id='q-'+Date.now().toString(36);}
    $('#adGo').disabled=true;
    try{await TR.api('/sched/save',{token:TR.token,items:[it]});view.due=due;const tx=$('#adText');if(tx)tx.value='';await TR.reload();$('#adMsg')&&($('#adMsg').textContent='Added.');}catch(e){alert(e.message);}
    const g=$('#adGo');if(g)g.disabled=false;
  };
  $$('[data-del]',root).forEach(b=>b.onclick=async()=>{if(!confirm('Remove this from the schedule for everyone?'))return;try{await TR.api('/sched/delete',{token:TR.token,id:b.dataset.del});await TR.reload();}catch(e){alert(e.message);}});
  $$('[data-move]',root).forEach(inp=>inp.onchange=async()=>{const it=items.find(i=>i.id===inp.dataset.move);if(!it||!inp.value)return;
    try{await TR.api('/sched/save',{token:TR.token,items:[Object.assign({},it,{due:inp.value})]});await TR.reload();}catch(e){alert(e.message);}});
}
async function loadPlan(){
  const b=$('#scLoad');b.disabled=true;$('#scMsg').textContent='Loading...';
  try{const items=SCHED_PLAN.items.map(i=>Object.assign({who:'all'},i));
    for(let k=0;k<items.length;k+=100)await TR.api('/sched/save',{token:TR.token,items:items.slice(k,k+100)});
    await TR.reload();}catch(e){$('#scMsg').textContent=e.message;b.disabled=false;}
}

function render(){if(!root)return;if(view.page==='edit')renderEdit();else renderWeek();}
let cssDone=false;
window.SchedView={render(el){if(!cssDone){const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);cssDone=true;}root=el;
  if(view.page==='edit'&&$('#adText',root)&&$('#adText',root).value)return;render();}};
})();
