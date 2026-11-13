/* =====================================================================
   Teacher tracker: overview of what the class knows, where the gaps
   are, written feedback, and setting work.
   Uses TR (from course-tracker.html), TAXO, Analysis and WorkGen.
   ===================================================================== */
(function(){
"use strict";
const A=window.Analysis,W=window.WorkGen,T=window.TAXO,esc=W.esc;
const PROXY='https://nishkam-marker.alevelnishkam.workers.dev',MODEL='claude-sonnet-4-6';
const $=(s,r)=>(r||document).querySelector(s),$$=(s,r)=>[...(r||document).querySelectorAll(s)];
let root=null,view={page:'class'},cacheFor=null,cache=null,openUnits=new Set();

const css=`
.ov-top{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px}
.ov-top .sp{flex:1}
.ov-grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:20px;align-items:start;margin-bottom:20px}
.ov-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;box-shadow:var(--shadow);margin-bottom:20px}
.ov-card h2{font-size:1.3rem;margin-bottom:10px}
.ov-card p.note{color:var(--muted);font-size:.85rem;margin:8px 0 0}
.ov-heat{border-collapse:collapse;font-size:.8rem;width:auto}
.ov-heat th,.ov-heat td{padding:3px 4px;border-bottom:1px solid var(--line);text-align:center;white-space:nowrap}
.ov-heat th.n{writing-mode:vertical-rl;transform:rotate(180deg);height:92px;font-weight:600;color:var(--fg);vertical-align:bottom;cursor:pointer}
.ov-heat td.l{text-align:left;white-space:normal;min-width:220px;max-width:300px}
.ov-heat tr.u td.l{font-weight:600;cursor:pointer}
.ov-heat tr.t td.l{padding-left:18px;color:var(--muted)}
.hc{display:inline-block;width:34px;padding:2px 0;border-radius:5px;font:600 .72rem "IBM Plex Mono",monospace}
.hc.secure{background:var(--ok-soft);color:var(--ok)}.hc.patchy{background:var(--amber-soft);color:var(--amber)}.hc.gap{background:var(--end-soft);color:var(--end)}.hc.none{color:var(--line)}
.hc.low{opacity:.55}
.ov-list{list-style:none;padding:0;margin:0;display:grid;gap:8px;font-size:.9rem}
.ov-list li{padding-bottom:8px;border-bottom:1px solid var(--line)}
.ov-list li:last-child{border-bottom:0}
.ov-list .why{color:var(--muted);font-size:.84rem}
.lnk{border:0;background:none;color:var(--fg);font:inherit;font-weight:600;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:2px}
.bars2{display:grid;gap:7px}
.bar2{display:grid;grid-template-columns:minmax(120px,210px) minmax(0,1fr) 54px;gap:10px;align-items:center;font-size:.86rem}
.bar2 .lnk{text-align:left}
.bar2 .t{height:10px;border-radius:9px;background:var(--line);overflow:hidden}
.bar2 .t i{display:block;height:100%;border-radius:9px}
.bar2 .t i.secure{background:var(--ok)}.bar2 .t i.patchy{background:var(--amber)}.bar2 .t i.gap{background:var(--end)}
.ov-out{white-space:pre-wrap;background:var(--bg2);border-radius:10px;padding:14px;line-height:1.65;font-size:.92rem;margin-top:12px}
textarea.ov{width:100%;min-height:150px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--fg);padding:11px 13px;font:15px/1.55 "IBM Plex Sans",sans-serif}
.ov-form{display:grid;gap:14px}
.ov-form label.f{font-size:.8rem;font-weight:600;color:var(--muted);display:block;margin-bottom:4px}
.ov-form .row{display:flex;gap:14px;flex-wrap:wrap}
.ov-form .row>div{flex:1 1 140px}
.ov-form input[type=number],.ov-form input[type=text],.ov-form input[type=date]{margin:0}
.chk{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.9rem}
.chk label{display:flex;gap:6px;align-items:center;cursor:pointer}
.chk input{width:auto;margin:0}
.pv{border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-top:12px}
.pv summary{cursor:pointer;font-weight:600}
.pq{border-top:1px solid var(--line);padding:12px 0;display:grid;gap:6px}
.pq .meta{font-size:.78rem;color:var(--muted);display:flex;gap:10px;align-items:center}
.pq textarea{width:100%;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--fg);padding:8px 10px;font:14px/1.5 "IBM Plex Sans",sans-serif;min-height:56px}
.pq .opt{display:flex;gap:8px;align-items:center}
.pq .opt input[type=text]{margin:0;padding:7px 10px;font-size:14px}
.pq .opt input[type=radio]{width:auto;margin:0}
.wk-ans{white-space:pre-wrap;background:var(--bg2);border-radius:8px;padding:8px 10px;font-size:.88rem;margin-top:4px}
.trend{display:flex;align-items:flex-end;gap:4px;height:60px;margin-top:6px}
.trend i{display:block;width:16px;background:var(--fg);opacity:.7;border-radius:3px 3px 0 0}
@media (max-width:900px){.ov-grid{grid-template-columns:minmax(0,1fr)}}`;

/* ---------- data ---------- */
function compute(){
  const d=TR.data;if(cacheFor===d&&cache)return cache;
  const list=(d.accounts||[]).slice().sort((a,b)=>a.name.localeCompare(b.name)).map(acc=>{
    const u=acc.username;
    const dd={store:(d.store||{})[u]||{},marks:(d.marks||[]).filter(m=>m.exam===u),attempts:(d.rows||[]).filter(r=>r.exam===u),
      work:(d.work||[]).filter(w=>w.exam===u),blurts:(d.blurts||[]).filter(b=>b.exam===u)};
    const times=[acc.lastSeen,...dd.marks.map(m=>m.t),...dd.attempts.map(m=>m.t),...dd.blurts.map(m=>m.t),...dd.work.map(w=>w.done_at)].filter(Boolean).map(t=>Date.parse(t)).filter(x=>!isNaN(x));
    return {u,name:acc.name,first:acc.name.split(' ')[0],acc,d:dd,a:A.analyse(dd),last:times.length?Math.max(...times):0};
  });
  /* tell apart students with the same first name */
  const cnt={};list.forEach(s=>{cnt[s.first]=(cnt[s.first]||0)+1;});list.forEach(s=>{if(cnt[s.first]>1)s.first=s.name;});
  cacheFor=d;cache=list;return list;
}
function attention(s){
  const out=[],now=Date.now(),day=86400000;
  if(!s.acc.lastSeen)out.push('Has not signed in yet');
  else if(s.last&&now-s.last>7*day)out.push(`Not active for ${Math.round((now-s.last)/day)} days`);
  const byStage={};s.d.attempts.forEach(r=>{const x=byStage[r.stage]=byStage[r.stage]||{n:0,p:false,title:r.stageTitle};x.n++;if(r.passed)x.p=true;});
  Object.values(byStage).filter(x=>x.n>=3&&!x.p).forEach(x=>out.push(`Stuck on ${x.title} (${x.n} tries)`));
  const e=s.a.essays.map(x=>x.p);
  if(e.length>=4){const k=Math.min(3,Math.floor(e.length/2)),last=e.slice(-k),prev=e.slice(-2*k,-k),av=a=>a.reduce((x,y)=>x+y,0)/a.length;
    if(av(prev)-av(last)>=10)out.push(`Extended answers falling: ${Math.round(av(prev))}% to ${Math.round(av(last))}%`);}
  const late=s.d.work.filter(w=>w.source==='teacher'&&w.status!=='done'&&now-Date.parse(w.due||w.created)>(w.due?0:7*day));
  if(late.length)out.push(`${late.length} piece${late.length>1?'s':''} of set work not done`);
  if(s.a.gaps.length>=6)out.push(`${s.a.gaps.length} topics with gaps`);
  return out;
}
const st=x=>A.status(x&&x.n>=1?x:null);
const cell=x=>{const s=st(x);return `<span class="hc ${s}${x&&x.n<2.5?' low':''}" title="${x&&x.n?`${Math.round(x.score*100)}% from ${Math.round(x.n*10)/10} pieces of evidence`:'No evidence yet'}">${s==='none'?'·':Math.round(x.score*100)}</span>`;};
const bar=(label,x)=>{const s=st(x);return `<div class="bar2"><span>${label}</span><div class="t">${s==='none'?'':`<i class="${s}" style="width:${Math.max(4,Math.round(x.score*100))}%"></i>`}</div><span class="muted">${s==='none'?'–':Math.round(x.score*100)+'%'}</span></div>`;};
const ago=t=>t?TR.ago(new Date(t).toISOString()):'never';

/* ---------- class page ---------- */
function classGaps(list){
  const o={};
  list.forEach(s=>Object.entries(s.a.topics).forEach(([id,x])=>{if(x.n<1)return;const y=o[id]=o[id]||{n:0,s:0,who:[]};y.n+=x.n;y.s+=x.s;if(x.score<.6&&x.n>=1.5)y.who.push(s);}));
  return Object.entries(o).map(([id,y])=>Object.assign({id,score:y.s/y.n},A.TOP[id],y)).filter(y=>y.who.length>=2||y.score<.6&&y.n>=4).sort((a,b)=>b.who.length-a.who.length||a.score-b.score).slice(0,12);
}
function renderClass(){
  const list=compute(),d=TR.data,now=Date.now(),day=86400000;
  const active=list.filter(s=>s.last&&now-s.last<7*day).length;
  const recentE=list.flatMap(s=>s.a.essays.filter(e=>now-Date.parse(e.t)<30*day)).map(e=>e.p);
  const set=(d.work||[]).filter(w=>w.source==='teacher'),done=set.filter(w=>w.status==='done');
  const gaps=classGaps(list);
  const units=T.units.map(u=>u.unit);
  const topicsBy={};T.topics.forEach(([id,unit])=>{(topicsBy[unit]=topicsBy[unit]||[]).push(id);});
  root.innerHTML=`
  <div class="ov-top"><button class="btn" id="ovSum">Write a class summary</button><button class="btn ghost" id="ovSetAll">Set work</button><span class="sp"></span><span class="muted" style="font-size:.85rem">Click a name for one student's profile.</span></div>
  <div class="stats">
    <div class="card stat"><b>${active} / ${list.length}</b><span>active in the last 7 days</span></div>
    <div class="card stat"><b>${recentE.length?Math.round(recentE.reduce((a,b)=>a+b,0)/recentE.length)+'%':'–'}</b><span>average extended answer, last 30 days</span></div>
    <div class="card stat"><b>${done.length} / ${set.length}</b><span>pieces of set work completed</span></div>
    <div class="card stat"><b>${gaps.length}</b><span>topics where several students have gaps</span></div>
  </div>
  <div id="ovSumOut"></div>
  <div class="ov-grid">
    <div class="ov-card"><h2>Gaps across the class</h2>${gaps.length?`<table><thead><tr><th class="l">Topic</th><th>Class</th><th class="l">Students with a gap</th><th></th></tr></thead><tbody>${gaps.map(g=>`<tr><td class="l" style="white-space:normal">${esc(g.ref+' '+g.title)}</td><td>${cell(g)}</td><td class="l" style="white-space:normal">${g.who.map(s=>esc(s.first)).join(', ')||'–'}</td><td><button class="btn ghost" style="padding:4px 10px" data-gap="${g.id}">Set work</button></td></tr>`).join('')}</tbody></table>`:'<p class="muted">Not enough evidence yet.</p>'}
      <p class="note">A topic shows here when two or more students score under 60% on it. Hover over a score to see how much evidence it is based on.</p></div>
    <div class="ov-card"><h2>Needs attention</h2><ul class="ov-list">${(()=>{const ns=list.filter(s=>!s.acc.lastSeen);const rest=list.map(s=>({s,w:attention(s).filter(w=>w!=='Has not signed in yet')})).filter(x=>x.w.length);
      return (ns.length?`<li><b>Not signed in yet</b><div class="why">${ns.map(s=>esc(s.first)).join(', ')}</div></li>`:'')+rest.map(x=>`<li><button class="lnk" data-u="${esc(x.s.u)}">${esc(x.s.name)}</button><div class="why">${x.w.map(esc).join(' · ')}</div></li>`).join('')||'<li class="muted">Nobody at the moment.</li>';})()}</ul></div>
  </div>
  <div class="ov-card"><h2>Knowledge by unit</h2><p class="note" style="margin:0 0 10px">Percentage right across courses, blurting, quizzes and marked answers. Click a unit to see its topics. Faded scores are based on very little evidence.</p>
    <div class="tablewrap"><table class="ov-heat"><thead><tr><th class="l"></th>${list.map(s=>`<th class="n" data-u="${esc(s.u)}" title="${esc(s.name)}">${esc(s.first)}</th>`).join('')}</tr></thead><tbody>
    ${units.map(u=>{const ut=T.units.find(x=>x.unit===u);return `<tr class="u" data-unit="${u}"><td class="l">${openUnits.has(u)?'▾':'▸'} ${u} ${esc(ut.title)}</td>${list.map(s=>`<td>${cell(s.a.units[u])}</td>`).join('')}</tr>`+
      (openUnits.has(u)?(topicsBy[u]||[]).map(id=>`<tr class="t"><td class="l">${esc(A.TOP[id].ref+' '+A.TOP[id].title)}</td>${list.map(s=>`<td>${cell(s.a.topics[id])}</td>`).join('')}</tr>`).join(''):'');}).join('')}
    </tbody></table></div>
    <div class="legend"><span><span class="hc secure">80</span> secure (75%+)</span><span><span class="hc patchy">60</span> patchy</span><span><span class="hc gap">30</span> gap (under 50%)</span><span><span class="hc none">·</span> no evidence yet</span></div></div>
  <div class="ov-card"><h2>Skills</h2><div class="tablewrap"><table class="ov-heat"><thead><tr><th class="l"></th>${list.map(s=>`<th class="n" data-u="${esc(s.u)}" title="${esc(s.name)}">${esc(s.first)}</th>`).join('')}</tr></thead><tbody>
    ${T.skills.map(([k,n])=>`<tr><td class="l">${n}</td>${list.map(s=>`<td>${cell(s.a.skills[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <p class="note">Skills come from the course questions (each is tagged with the skill it tests), set work, and what the marking feedback says went well or needs improving.</p></div>
  ${workTable((d.work||[]).slice(0,40),true)}`;
  $$('[data-u]',root).forEach(b=>b.onclick=()=>{view={page:'student',u:b.dataset.u};render();scrollTo({top:0});});
  $$('tr.u',root).forEach(tr=>tr.onclick=()=>{const u=tr.dataset.unit;openUnits.has(u)?openUnits.delete(u):openUnits.add(u);render();});
  $$('[data-gap]',root).forEach(b=>b.onclick=()=>{const g=gaps.find(x=>x.id===b.dataset.gap);view={page:'set',users:g.who.map(s=>s.u),topics:[g.id],back:'class'};render();scrollTo({top:0});});
  $('#ovSetAll').onclick=()=>{view={page:'set',users:list.map(s=>s.u),topics:[],back:'class'};render();scrollTo({top:0});};
  $('#ovSum').onclick=()=>classSummary(list,gaps);
  bindWork();
}
function workTable(ws,withName){
  if(!ws.length)return `<div class="ov-card"><h2>Set work and practice</h2><p class="muted">Nothing yet.</p></div>`;
  return `<div class="ov-card"><h2>Set work and practice</h2><div class="tablewrap"><table><thead><tr>${withName?'<th class="l">Student</th>':''}<th class="l">Set</th><th class="l">Title</th><th class="l">Status</th><th>Score</th><th></th></tr></thead><tbody>
  ${ws.map(w=>`<tr>${withName?`<td class="l">${esc(w.name)}</td>`:''}<td class="l muted">${w.source==='self'?'Self-made':'By you'} · ${new Date(w.created).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</td><td class="l" style="white-space:normal">${esc(w.title)}</td>
    <td class="l">${w.status==='done'?'Done':w.status==='started'?'Started':'Not started'}${w.due&&w.status!=='done'?` <span class="muted">due ${esc(w.due)}</span>`:''}</td><td>${w.status==='done'?`<span class="cell ${w.total&&w.score/w.total>=.7?'p':'a'}">${w.score}/${w.total}</span>`:''}</td>
    <td><button class="btn ghost" style="padding:4px 10px" data-w="${esc(w.id)}">Open</button></td></tr>`).join('')}</tbody></table></div><div id="wkOpen"></div></div>`;
}
function bindWork(){
  $$('[data-w]',root).forEach(b=>b.onclick=()=>{
    const w=TR.data.work.find(x=>x.id===b.dataset.w);if(!w)return;const box=b.closest('.ov-card').querySelector('#wkOpen');
    const items=(w.spec&&w.spec.items)||[],res=(w.result&&w.result.items)||[];
    box.innerHTML=`<div class="pv"><b>${esc(w.name)}: ${esc(w.title)}</b>${items.map((it,i)=>{const r=res[i],a=(w.answers||{})[i];
      return `<div class="pq"><div class="meta">${W.typeName[it.type]} · ${esc(W.label(it))}${r?` · <b>${r.marks}/${r.max}</b>`:''}</div><div>${esc(it.q)}</div>
      ${it.type==='mcq'?`<div class="muted" style="font-size:.86rem">Answer: ${esc(it.options[it.answer])}${a!=null&&a!==''?` · They chose: ${esc(it.options[a])}`:''}</div>`:''}
      ${it.type==='calc'?`<div class="muted" style="font-size:.86rem">Answer: ${it.answer} ${esc(it.unit)}${a?` · They wrote: ${esc(a)}`:''}</div>`:''}
      ${(it.type==='short'||it.type==='extended')&&a?`<div class="wk-ans">${esc(a)}</div>`:''}${r&&r.feedback?`<div class="muted" style="font-size:.86rem">${esc(r.feedback)}</div>`:''}</div>`;}).join('')}
      <div style="margin-top:10px;display:flex;gap:10px"><button class="btn ghost" id="wkClose">Close</button>${w.source==='teacher'?'<button class="btn ghost" id="wkDel">Delete this work</button>':''}</div></div>`;
    $('#wkClose',box).onclick=()=>{box.innerHTML='';};
    const del=$('#wkDel',box);if(del)del.onclick=async()=>{if(!confirm('Delete this piece of work for this student?'))return;try{await TR.api('/work/delete',{token:TR.token,id:w.id});await TR.reload();}catch(e){alert(e.message);}};
    box.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
}

/* ---------- one student ---------- */
function renderStudent(){
  const list=compute(),s=list.find(x=>x.u===view.u);if(!s){view={page:'class'};return render();}
  const a=s.a,note=(TR.data.notes||{})[s.u],steps=A.nextSteps(a),att=attention(s);
  const topicsBy={};T.topics.forEach(([id,unit])=>{(topicsBy[unit]=topicsBy[unit]||[]).push(id);});
  const recent=s.d.marks.slice().sort((x,y)=>String(y.t).localeCompare(String(x.t))).slice(0,8);
  const ess=a.essays.slice(-14);
  root.innerHTML=`
  <div class="ov-top"><button class="btn ghost" id="ovBack">Back to the class</button><span class="sp"></span><button class="btn" id="ovFb">Write feedback</button><button class="btn ghost" id="ovSet1">Set work for ${esc(s.first)}</button></div>
  <div class="ov-card"><h2 style="font-size:1.8rem;margin-bottom:4px">${esc(s.name)}</h2><p class="muted" style="margin:0">${esc(s.u)} · last active ${ago(s.last)}${att.length?' · '+att.map(esc).join(' · '):''}</p>
    <h3 style="margin:16px 0 6px;font-size:1rem">Next steps</h3>${steps.length?`<ol style="margin:0;padding-left:20px">${steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:'<p class="muted">Not enough evidence yet.</p>'}</div>
  <div class="ov-grid">
    <div class="ov-card"><h2>Knowledge by unit</h2><div class="bars2">${T.units.map(u=>bar(`<button class="lnk" data-unit="${u.unit}" style="font-weight:500">${u.unit} ${esc(u.title)}</button>`,a.units[u.unit])+(openUnits.has(u.unit)?`<div style="padding-left:14px;display:grid;gap:5px">${(topicsBy[u.unit]||[]).map(id=>bar(`<span class="muted">${esc(A.TOP[id].ref+' '+A.TOP[id].title)}</span>`,a.topics[id])).join('')}</div>`:'')).join('')}</div></div>
    <div><div class="ov-card"><h2>Skills</h2><div class="bars2">${T.skills.map(([k,n])=>bar(n,a.skills[k])).join('')}</div></div>
      <div class="ov-card"><h2>Extended answers</h2>${ess.length?`<div class="trend">${ess.map(e=>`<i style="height:${Math.max(4,e.p*.6)}px" title="${esc(e.tool)} ${Math.round(e.p)}%"></i>`).join('')}</div><p class="note">Oldest to newest. Latest: ${Math.round(ess[ess.length-1].p)}%.</p>`:'<p class="muted">None yet.</p>'}</div></div>
  </div>
  <div class="ov-grid">
    <div class="ov-card"><h2>Gaps</h2>${a.gaps.length?`<table><thead><tr><th class="l">Topic</th><th>Score</th><th class="l">Evidence from</th></tr></thead><tbody>${a.gaps.slice(0,12).map(g=>`<tr><td class="l" style="white-space:normal">${esc(g.ref+' '+g.title)}</td><td>${cell(g)}</td><td class="l muted" style="white-space:normal">${Object.keys(g.src).map(esc).join(', ')}</td></tr>`).join('')}</tbody></table>`:'<p class="muted">No clear gaps yet.</p>'}</div>
    <div class="ov-card"><h2>Strengths</h2>${a.strengths.length?`<ul class="ov-list">${a.strengths.slice(0,10).map(g=>`<li>${esc(g.ref+' '+g.title)} <span class="muted">${Math.round(g.score*100)}%</span></li>`).join('')}</ul>`:'<p class="muted">Not enough evidence yet.</p>'}</div>
  </div>
  <div class="ov-card"><h2>Recent marks</h2>${recent.length?`<ul class="ov-list">${recent.map(m=>`<li><b>${esc(m.mark)}</b> ${esc(m.tool)} <span class="muted">${new Date(m.t).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span><div class="why">${esc(String(m.question).slice(0,160))}</div>${m.improve?`<div class="why">To improve: ${esc(String(m.improve).slice(0,260))}</div>`:''}</li>`).join('')}</ul>`:'<p class="muted">None yet.</p>'}</div>
  <div class="ov-card"><h2>Your notes and feedback</h2><p class="note" style="margin:0 0 8px">"Write feedback" drafts this from all of ${esc(s.first)}'s data. Edit it and save it here. Only you can see it.</p>
    <textarea class="ov" id="ovNote">${esc(note?note.text:'')}</textarea><div style="display:flex;gap:10px;margin-top:8px;align-items:center"><button class="btn" id="ovNoteSave">Save</button><button class="btn ghost" id="ovCopy">Copy</button><span class="muted" id="ovNoteMsg" style="font-size:.85rem">${note?'Saved '+ago(Date.parse(note.t)):''}</span></div></div>
  ${workTable(s.d.work,false)}`;
  $('#ovBack').onclick=()=>{view={page:'class'};render();};
  $$('[data-unit]',root).forEach(b=>b.onclick=()=>{const u=b.dataset.unit;openUnits.has(u)?openUnits.delete(u):openUnits.add(u);render();});
  $('#ovSet1').onclick=()=>{view={page:'set',users:[s.u],topics:[],back:'student',u:s.u};render();scrollTo({top:0});};
  $('#ovFb').onclick=()=>studentFeedback(s);
  $('#ovNoteSave').onclick=async()=>{try{await TR.api('/notes/save',{token:TR.token,username:s.u,text:$('#ovNote').value});(TR.data.notes=TR.data.notes||{})[s.u]={text:$('#ovNote').value,t:new Date().toISOString()};$('#ovNoteMsg').textContent='Saved';}catch(e){$('#ovNoteMsg').textContent=e.message;}};
  $('#ovCopy').onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText($('#ovNote').value);$('#ovNoteMsg').textContent='Copied';};
  bindWork();
}

/* ---------- AI writing ---------- */
async function askText(system,content,max){
  const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,max_tokens:max||1800,system,messages:[{role:'user',content}]})});
  if(!r.ok)throw new Error('The AI did not respond ('+r.status+')');
  const d=await r.json();return (d.content||[]).map(c=>c.text||'').join('').trim();
}
const STYLE=`Write in plain British English, the way an experienced A-level Business teacher writes. No headings in capitals, no bold, no markdown symbols, no emoji, no hype. Be specific and honest. Only use AQA 7138 specification content.`;
async function studentFeedback(s){
  const btn=$('#ovFb');btn.disabled=true;btn.textContent='Writing...';
  const marks=s.d.marks.slice().sort((x,y)=>String(y.t).localeCompare(String(x.t))).slice(0,8).map(m=>`${m.tool} ${m.mark}: ${String(m.question).slice(0,120)}. To improve: ${String(m.improve||'').slice(0,300)}`).join('\n');
  try{
    const txt=await askText(`You help an AQA A-level Business (7138) teacher write feedback for one Year 12 student, based on the student's data from the revision site. ${STYLE}
Write two parts, each starting with the plain label shown:
For you: 3 to 5 sentences for the teacher on what the evidence shows, which gaps matter most, and anything to watch (for example how much evidence there is).
For ${s.first}: a short message to the student, as "you", of 5 to 8 sentences: what they are doing well, the two or three things to work on with a concrete action for each, and what to do on the site this week (blurting a topic, a course stage, or the essay labs).`,
      `Student: ${s.first}\nLast active: ${ago(s.last)}\n${A.summary(s.a,8)}\nNext steps worked out from the data: ${A.nextSteps(s.a).join(' ')}\nRecent marked work:\n${marks||'none'}`);
    $('#ovNote').value=txt;$('#ovNoteMsg').textContent='Draft written - edit it, then save';
  }catch(e){alert(e.message);}
  btn.disabled=false;btn.textContent='Write feedback';
}
async function classSummary(list,gaps){
  const out=$('#ovSumOut');out.innerHTML='<div class="ov-card"><p class="muted">Writing the class summary...</p></div>';
  try{
    const rows=list.map(s=>`${s.first}: last active ${ago(s.last)}. ${A.summary(s.a,4).replace(/\n/g,' ')}`).join('\n');
    const txt=await askText(`You help an AQA A-level Business (7138) teacher understand their Year 12 class from revision-site data. ${STYLE}
Write four short parts, each starting with the plain label shown:
Overall: 2 to 3 sentences.
Reteach to the whole class: the 3 to 5 topics or skills most worth reteaching, with one sentence each on why.
Students to check on: names and the reason, briefly.
Suggested next lessons: 3 concrete lesson or homework ideas aimed at the gaps.
Say where the evidence is thin rather than guessing.`,
      `Class gaps (topic, class %, students with a gap):\n${gaps.map(g=>`${g.ref} ${g.title}: ${Math.round(g.score*100)}%, ${g.who.map(s=>s.first).join(', ')}`).join('\n')||'none'}\n\nStudents:\n${rows}`,2400);
    out.innerHTML=`<div class="ov-card"><h2>Class summary</h2><div class="ov-out">${esc(txt)}</div><div style="margin-top:10px;display:flex;gap:10px"><button class="btn ghost" id="sumCopy">Copy</button><button class="btn ghost" id="sumClose">Close</button></div></div>`;
    $('#sumCopy').onclick=()=>navigator.clipboard&&navigator.clipboard.writeText(txt);
    $('#sumClose').onclick=()=>{out.innerHTML='';};
  }catch(e){out.innerHTML=`<div class="ov-card"><p class="err">${esc(e.message)}</p></div>`;}
}

/* ---------- set work ---------- */
let drafts=[];
function renderSet(){
  const list=compute(),v=view;
  const chosen=new Set(v.users||[]),tset=new Set(v.topics||[]);
  root.innerHTML=`
  <div class="ov-top"><button class="btn ghost" id="setBack">Back</button></div>
  <div class="ov-card"><h2>Set work</h2><div class="ov-form">
    <div><label class="f">Students</label><div class="chk">${list.map(s=>`<label><input type="checkbox" value="${esc(s.u)}" ${chosen.has(s.u)?'checked':''} class="setU"> ${esc(s.name)}</label>`).join('')}</div>
      <div style="margin-top:6px"><button class="lnk" id="setAllU" style="font-weight:400">Select all</button> · <button class="lnk" id="setNoU" style="font-weight:400">Clear</button></div></div>
    <div><label class="f">What should it cover?</label><div class="chk"><label><input type="radio" name="focus" value="gaps" ${tset.size?'':'checked'}> Each student's own gaps</label><label><input type="radio" name="focus" value="topics" ${tset.size?'checked':''}> Topics I choose</label></div>
      <div id="setTopics" ${tset.size?'':'hidden'} style="margin-top:8px"><select id="setUnit" style="margin-bottom:8px">${T.units.map(u=>`<option value="${u.unit}">${u.unit} ${esc(u.title)}</option>`).join('')}</select><div class="chk" id="setTlist"></div><p class="note" id="setTsel"></p></div></div>
    <div class="row"><div><label class="f">Multiple choice</label><input type="number" id="nM" min="0" max="15" value="5"></div><div><label class="f">Calculations</label><input type="number" id="nC" min="0" max="8" value="2"></div>
      <div><label class="f">6-mark answers</label><input type="number" id="nS" min="0" max="6" value="2"></div><div><label class="f">Extended answer</label><select id="nE" style="width:100%"><option value="0">None</option><option value="9" selected>One 9-marker</option><option value="15">One 15-marker</option></select></div></div>
    <div class="row"><div><label class="f">Title (optional)</label><input type="text" id="sTitle" placeholder="Made from the topics if left blank"></div><div><label class="f">Due (optional)</label><input type="date" id="sDue"></div></div>
    <div><label class="f">Note for the AI (optional)</label><input type="text" id="sNote" placeholder="e.g. use a hotel business; keep the calculations short"></div>
    <div style="display:flex;gap:10px;align-items:center"><button class="btn" id="setGen">Make the work</button><span class="muted" id="setMsg" style="font-size:.9rem"></span></div>
    <p class="note" style="margin:0">Each student gets their own set. You can check and edit every question before anything is sent.</p>
  </div></div>
  <div id="setPrev"></div>`;
  const tl=$('#setTlist'),showT=()=>{const u=$('#setUnit').value;tl.innerHTML=T.topics.filter(t=>t[1]===u).map(([id,,ref,title])=>`<label><input type="checkbox" value="${id}" ${tset.has(id)?'checked':''} class="setT"> ${esc(ref+' '+title)}</label>`).join('');
    $$('.setT',tl).forEach(c=>c.onchange=()=>{c.checked?tset.add(c.value):tset.delete(c.value);sel();});};
  const sel=()=>{$('#setTsel').textContent=tset.size?'Chosen: '+[...tset].map(id=>A.TOP[id].ref+' '+A.TOP[id].title).join('; '):'No topics chosen yet.';};
  if(tset.size){const first=A.TOP[[...tset][0]];if(first)$('#setUnit').value=first.unit;}
  $('#setUnit').onchange=showT;showT();sel();
  $$('input[name=focus]').forEach(r=>r.onchange=()=>{$('#setTopics').hidden=r.value!=='topics'||!r.checked;});
  $('#setAllU').onclick=()=>$$('.setU').forEach(c=>{c.checked=true;});
  $('#setNoU').onclick=()=>$$('.setU').forEach(c=>{c.checked=false;});
  $('#setBack').onclick=()=>{view=v.back==='student'?{page:'student',u:v.u}:{page:'class'};render();};
  $('#setGen').onclick=async()=>{
    const users=$$('.setU').filter(c=>c.checked).map(c=>c.value);
    const mine=$('input[name=focus]:checked').value==='gaps';
    if(!users.length){$('#setMsg').textContent='Choose at least one student.';return;}
    if(!mine&&!tset.size){$('#setMsg').textContent='Choose at least one topic.';return;}
    const counts={mcq:+$('#nM').value||0,calc:+$('#nC').value||0,short:+$('#nS').value||0,extended:+$('#nE').value?1:0};
    const btn=$('#setGen');btn.disabled=true;drafts=[];let done=0;
    const jobs=users.map(u=>async()=>{
      const s=list.find(x=>x.u===u);
      const topics=mine?s.a.gaps.slice(0,4).map(g=>g.id):[...tset];
      try{const spec=await W.generate({topics,counts,extendedMarks:+$('#nE').value||9,about:A.summary(s.a,6),title:$('#sTitle').value.trim(),note:$('#sNote').value.trim()});
        drafts.push({u,name:s.name,spec});}
      catch(e){drafts.push({u,name:s.name,error:e.message});}
      done++;$('#setMsg').textContent=`Made ${done} of ${users.length}...`;
    });
    /* three at a time */
    let i=0;await Promise.all([0,1,2].map(async()=>{while(i<jobs.length){const j=jobs[i++];await j();}}));
    drafts.sort((a,b)=>a.name.localeCompare(b.name));
    $('#setMsg').textContent='Check the work below, then send it.';btn.disabled=false;preview();
  };
}
function preview(){
  const box=$('#setPrev');const ok=drafts.filter(d=>d.spec);
  box.innerHTML=`<div class="ov-card"><h2>Check before sending</h2>${drafts.map((d,di)=>d.error?`<div class="pv"><b>${esc(d.name)}</b>: <span class="err">${esc(d.error)}</span></div>`:`
    <details class="pv" ${drafts.length<=2?'open':''}><summary>${esc(d.name)}: ${esc(d.spec.title)} <span class="muted" style="font-weight:400">(${d.spec.items.length} questions)</span></summary>
    <div style="margin-top:8px"><label class="f" style="font-size:.8rem;color:var(--muted)">Title</label><input type="text" data-d="${di}" data-f="title" value="${esc(d.spec.title)}"></div>
    ${d.spec.items.map((it,ii)=>`<div class="pq" data-d="${di}" data-i="${ii}"><div class="meta">${W.typeName[it.type]} · ${esc(W.label(it))} · ${esc(A.SKILL[it.skill]||'')}<span style="flex:1"></span><button class="lnk" data-rm style="font-weight:400">Remove</button></div>
      ${it.case!==undefined?`<textarea data-k="case" placeholder="Case">${esc(it.case)}</textarea>`:''}<textarea data-k="q">${esc(it.q)}</textarea>
      ${it.type==='mcq'?it.options.map((o,oi)=>`<div class="opt"><input type="radio" name="a${di}_${ii}" value="${oi}" ${oi===it.answer?'checked':''} title="Correct answer"><input type="text" data-o="${oi}" value="${esc(o)}"></div>`).join('')+`<textarea data-k="explain" placeholder="Explanation">${esc(it.explain)}</textarea>`:''}
      ${it.type==='calc'?`<div class="opt">Answer <input type="text" data-k="answer" value="${it.answer}" style="max-width:140px"> <input type="text" data-k="unit" value="${esc(it.unit)}" style="max-width:90px" placeholder="unit"></div><textarea data-k="working">${esc(it.working)}</textarea>`:''}
      ${it.type==='short'?`<textarea data-k="points" title="Mark points, one per line">${esc(it.points.join('\n'))}</textarea>`:''}
      ${it.type==='extended'?`<textarea data-k="guidance" title="What a strong answer would do, one per line">${esc(it.guidance.join('\n'))}</textarea>`:''}</div>`).join('')}</details>`).join('')}
    ${ok.length?`<div style="display:flex;gap:10px;align-items:center;margin-top:14px"><button class="btn" id="setSend">Send to ${ok.length} student${ok.length>1?'s':''}</button><span class="muted" id="sendMsg"></span></div>`:''}</div>`;
  $$('input[data-f=title]',box).forEach(inp=>inp.oninput=()=>{drafts[+inp.dataset.d].spec.title=inp.value;});
  $$('.pq',box).forEach(q=>{
    const it=drafts[+q.dataset.d].spec.items[+q.dataset.i];
    $$('[data-k]',q).forEach(t=>t.oninput=()=>{const k=t.dataset.k;it[k]=k==='points'||k==='guidance'?t.value.split('\n').map(x=>x.trim()).filter(Boolean):k==='answer'?parseFloat(t.value):t.value;});
    $$('[data-o]',q).forEach(t=>t.oninput=()=>{it.options[+t.dataset.o]=t.value;});
    $$('input[type=radio]',q).forEach(r=>r.onchange=()=>{it.answer=+r.value;});
    $('[data-rm]',q).onclick=()=>{drafts[+q.dataset.d].spec.items.splice(+q.dataset.i,1);preview();};
  });
  const send=$('#setSend');if(send)send.onclick=async()=>{
    send.disabled=true;$('#sendMsg').textContent='Sending...';
    try{await TR.api('/work/set',{token:TR.token,items:ok.filter(d=>d.spec.items.length).map(d=>({username:d.u,title:d.spec.title,spec:d.spec,due:$('#sDue')?$('#sDue').value:''}))});
      drafts=[];await TR.reload();view=view.back==='student'?{page:'student',u:view.u}:{page:'class'};render();
      alert('Sent. Students will see it on their home page and the practice page.');}
    catch(e){$('#sendMsg').textContent=e.message;send.disabled=false;}
  };
}

function render(){
  if(!root)return;
  if(view.page==='student')renderStudent();else if(view.page==='set')renderSet();else renderClass();
}
let cssDone=false;
window.Overview={
  render(el){
    if(!cssDone){const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);cssDone=true;}
    if(root!==el){root=el;}
    /* keep the set-work page and drafts if the data refreshes in the middle */
    if(view.page==='set'&&$('#setPrev',root)&&drafts.length)return;
    render();
  }
};
})();
