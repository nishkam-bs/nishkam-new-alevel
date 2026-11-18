/* =====================================================================
   Teacher tracker: feedback report.
   Pick a time period and the whole class or one student, and see:
     - what happened (activity and results, compared with the period before)
     - a written briefing: what the work shows and what to go over in lessons
     - every marked answer grouped by type (9-markers, 16-markers ...),
       with the questions, marks, and a write-up per type
     - each student's numbers for the period
   Same file on the 7132 and 7138 sites. Uses TR (course-tracker.html),
   NMark (marking-uploads.js) and SchedView.qFix. No student data stored here
   (written briefings are kept on this device only, so they don't re-run).
   ===================================================================== */
(function(){
"use strict";
const IS12=/new-alevel|7138/.test(location.href);
const SPEC=IS12?'7138':'7132',YEAR=IS12?'Year 12':'Year 13';
const MODEL='claude-sonnet-4-6';
const DAY=86400000;
const $=(s,r)=>(r||document).querySelector(s),$$=(s,r)=>[...(r||document).querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const css=`
.rp-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:18px}
.rp-bar select,.rp-bar input[type=date]{width:auto;margin:0}
.rp-bar .sp{flex:1}
.rp-seg{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.rp-seg button{border:0;background:var(--card);color:var(--fg);font:inherit;font-size:.88rem;padding:8px 13px;cursor:pointer;border-right:1px solid var(--line)}
.rp-seg button:last-child{border-right:0}
.rp-seg button.on{background:var(--fg);color:var(--card);font-weight:600}
.rp-range{font-size:.86rem;color:var(--muted);margin:-8px 0 16px}
.rp-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:20px}
@media (max-width:800px){.rp-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}
.rp-tile{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;box-shadow:var(--shadow)}
.rp-tile b{display:block;font:400 1.9rem "DM Serif Display",Georgia,serif;line-height:1.1}
.rp-tile span{display:block;font-size:.84rem;color:var(--muted);margin-top:4px}
.rp-tile em{display:block;font-style:normal;font-size:.78rem;margin-top:6px;color:var(--muted)}
.rp-tile em.up{color:var(--ok)}.rp-tile em.down{color:var(--end)}
.rp-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px;box-shadow:var(--shadow);margin-bottom:20px}
.rp-card h2{font-size:1.3rem;margin:0 0 6px}
.rp-card>p.sub{color:var(--muted);font-size:.86rem;margin:0 0 14px}
.rp-ai{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px}
@media (max-width:800px){.rp-ai{grid-template-columns:minmax(0,1fr)}}
.rp-ai section{background:var(--bg2);border-radius:12px;padding:16px 18px;min-width:0}
.rp-ai section.wide{grid-column:1/-1}
.rp-ai h3{font-size:.95rem;margin:0 0 8px}
.rp-ai ul,.rp-ai ol{margin:0;padding-left:20px;display:grid;gap:7px;font-size:.92rem;line-height:1.55}
.rp-ai .re{display:grid;gap:12px}
.rp-ai .re>div{border-left:4px solid var(--gold);padding:2px 0 2px 12px}
.rp-ai .re b{display:block;margin-bottom:2px}
.rp-ai .re .h{color:var(--muted);font-size:.88rem;margin-top:4px}
.rp-head{font-size:1.05rem;line-height:1.6;margin:14px 0 0}
.rp-thin{font-size:.84rem;color:var(--muted);margin-top:12px}
.rp-chips{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 16px}
.rp-chip{border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:999px;padding:7px 14px;font:inherit;font-size:.88rem;cursor:pointer}
.rp-chip b{font-weight:700;margin-left:4px}
.rp-chip.on{background:var(--fg);color:var(--card);border-color:var(--fg)}
.rp-sum{display:flex;flex-wrap:wrap;gap:18px;font-size:.9rem;color:var(--muted);margin-bottom:12px}
.rp-sum b{color:var(--fg)}
.rp-q{border-top:1px solid var(--line)}
.rp-q:last-child{border-bottom:1px solid var(--line)}
.rp-q>summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) 70px 70px 64px;gap:12px;align-items:center;padding:12px 4px;font-size:.92rem}
.rp-q>summary::-webkit-details-marker{display:none}
.rp-q>summary .t{line-height:1.45}
.rp-q>summary .t small{display:block;color:var(--muted);font-size:.8rem;margin-top:2px}
.rp-q>summary .n{text-align:center;color:var(--muted);font-size:.85rem}
.rp-q>summary .n b{display:block;color:var(--fg);font-size:1rem}
.rp-qh{display:grid;grid-template-columns:minmax(0,1fr) 70px 70px 64px;gap:12px;padding:0 4px 6px;font-size:.76rem;color:var(--muted);text-align:center}
.rp-qh span:first-child{text-align:left}
.rp-at{display:grid;gap:10px;padding:4px 4px 16px}
.rp-at>div{background:var(--bg2);border-radius:10px;padding:12px 14px;font-size:.88rem;line-height:1.55}
.rp-at .m{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-bottom:4px}
.rp-at .m b{font-size:.95rem}
.rp-at .m span{color:var(--muted);font-size:.8rem}
.rp-at .w{color:var(--ok)}.rp-at .i{color:var(--amber)}
.rp-pc{display:inline-block;min-width:46px;text-align:center;padding:3px 8px;border-radius:7px;font:600 .8rem "IBM Plex Mono",monospace}
.rp-pc.g{background:var(--ok-soft);color:var(--ok)}.rp-pc.m{background:var(--amber-soft);color:var(--amber)}.rp-pc.l{background:var(--end-soft);color:var(--end)}.rp-pc.x{color:var(--muted)}
.rp-trend{display:flex;align-items:flex-end;gap:6px;height:130px;margin-top:10px;padding-bottom:22px;position:relative}
.rp-trend .wk{flex:1 1 0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0;position:relative}
.rp-trend .wk i{display:block;width:70%;max-width:34px;background:var(--fg);opacity:.75;border-radius:4px 4px 0 0}
.rp-trend .wk small{position:absolute;bottom:-20px;font-size:.7rem;color:var(--muted);white-space:nowrap}
.rp-trend .wk em{font-style:normal;font-size:.72rem;color:var(--muted);margin-bottom:3px}
.rp-btnrow{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.rp-wait{display:flex;gap:10px;align-items:center;color:var(--muted);font-size:.9rem;margin-top:14px}
.rp-wait::before{content:"";width:16px;height:16px;border-radius:50%;border:3px solid var(--line);border-top-color:var(--fg);animation:rpspin .8s linear infinite}
@keyframes rpspin{to{transform:rotate(360deg)}}
@media (max-width:700px){.rp-q>summary,.rp-qh{grid-template-columns:minmax(0,1fr) 54px 54px}.rp-q>summary .n:nth-child(3),.rp-qh span:nth-child(3){display:none}}`;

let root=null,opts={},st={p:'7',from:'',to:'',u:'',type:''};

/* ---------- helpers ---------- */
const T=x=>typeof x==='number'?x:Date.parse(x);
function parseMark(m){const x=String(m||'').match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+)/);return x&&+x[2]?{got:+x[1],max:+x[2],pct:Math.min(100,+x[1]/+x[2]*100)}:null;}
function parseHow(m){try{return m&&m.how?JSON.parse(m.how):null;}catch(e){return null;}}
function howKind(h){if(!h)return '';if(h.m==='photo')return 'hw';const tot=(h.k||0)+(h.p||0);if(((h.p||0)>=300&&(h.p||0)>=tot*0.5)||(h.big||0)>=500)return 'pz';return 'ty';}
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const pc=x=>x==null?'–':Math.round(x)+'%';
const pcls=x=>x==null?'x':x>=70?'g':x>=50?'m':'l';
const pill=x=>`<span class="rp-pc ${pcls(x)}">${pc(x)}</span>`;
const nm=u=>((TR.data.roster||{})[u])||u;
const first=u=>{const f=nm(u).split(' ')[0];const same=(TR.data.accounts||[]).filter(a=>a.name.split(' ')[0]===f).length;return same>1?nm(u):f;};
const dShort=t=>new Date(t).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
const dLong=t=>new Date(t).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
function yearStart(){const n=new Date(),y=n.getMonth()>=8?n.getFullYear():n.getFullYear()-1;return new Date(y,8,1).getTime();}
function range(){
  const now=Date.now(),end=new Date();end.setHours(23,59,59,999);
  if(st.p==='custom'&&st.from){const f=new Date(st.from+'T00:00:00').getTime(),t=st.to?new Date(st.to+'T23:59:59').getTime():end.getTime();return {from:f,to:t};}
  if(st.p==='year')return {from:yearStart(),to:now};
  const d=+st.p||7;return {from:now-d*DAY,to:now};
}
const TYPE_NAME=n=>n==='redraft'?'Redrafts':n+'-markers';

/* ---------- gather everything in a time window ---------- */
function gather(from,to,u){
  const d=TR.data,inR=t=>{const x=T(t);return x>=from&&x<=to;},me=x=>!u||x===u;
  const exams=window.EXAMS||[];
  const marks=(d.marks||[]).filter(m=>me(m.exam)&&inR(m.t)).map(m=>{
    const p=parseMark(m.mark),red=/redraft/i.test(m.tool||'');
    const ex=m.ref?exams.find(e=>e.id===m.ref):null;
    return Object.assign({},m,{p,type:red?'redraft':p?p.max:null,full:ex?ex.q:m.question,label:ex?`${ex.label||ex.year} Paper ${ex.paper} Q${ex.num}`:'',hk:howKind(parseHow(m))});
  }).filter(m=>m.type);
  const essays=marks.filter(m=>m.type!=='redraft'&&m.p);
  const rows=(d.rows||[]).filter(r=>me(r.exam)&&inR(r.t));
  const blurts=(d.blurts||[]).filter(b=>me(b.exam)&&inR(b.t));
  const work=(d.work||[]).filter(w=>me(w.exam)&&w.done_at&&inR(w.done_at));
  const qf=(window.SchedView&&SchedView.qFix)||((k,v)=>v);
  const quiz={mcq:[],calc:[],drill:[]};
  Object.entries(d.storeT||{}).forEach(([usr,ks])=>{if(!me(usr))return;Object.entries(ks).forEach(([key,t])=>{
    if(!inR(t))return;const v=qf(key,((d.store||{})[usr]||{})[key]||{});if(!v||!v.done||!v.total)return;
    const p=v.score/v.total*100;
    if(/^quiz:mcq/.test(key))quiz.mcq.push({u:usr,p,t});else if(/^quiz:calc/.test(key))quiz.calc.push({u:usr,p,t});else if(/^drill:/.test(key))quiz.drill.push({u:usr,p,t,ref:key.slice(6)});
  });});
  const actUsers=new Set([...marks.map(m=>m.exam),...rows.map(r=>r.exam),...blurts.map(b=>b.exam),...work.map(w=>w.exam),...quiz.mcq.map(q=>q.u),...quiz.calc.map(q=>q.u),...quiz.drill.map(q=>q.u),
    ...(d.visits||[]).filter(v=>me(v.exam)&&inR(v.t)).map(v=>v.exam)]);
  return {marks,essays,rows,blurts,work,quiz,actUsers};
}
function byType(essays){
  const g={};essays.forEach(m=>{(g[m.type]=g[m.type]||[]).push(m);});
  return Object.keys(g).map(Number).sort((a,b)=>a-b).map(k=>({k,list:g[k]}));
}
function groupQuestions(list){
  const g={};list.forEach(m=>{const key=m.ref||String(m.full||m.question||'').toLowerCase().replace(/\s+/g,' ').trim().slice(0,90);(g[key]=g[key]||{key,full:m.full||m.question,label:m.label,list:[]}).list.push(m);});
  return Object.values(g).map(q=>Object.assign(q,{avg:avg(q.list.map(m=>m.p.pct)),who:[...new Set(q.list.map(m=>m.exam))]})).sort((a,b)=>b.list.length-a.list.length||a.avg-b.avg);
}

/* ---------- page ---------- */
function render(){
  const R=range(),len=R.to-R.from,cur=gather(R.from,R.to,st.u),prev=gather(R.from-len,R.from,st.u);
  const accs=(TR.data.accounts||[]).slice().sort((a,b)=>a.name.localeCompare(b.name));
  const types=byType(cur.essays);if(!types.find(t=>String(t.k)===String(st.type)))st.type=types.length?String(types[0].k):'';
  const scopeName=st.u?nm(st.u):'the whole class';
  const P=[['7','Last 7 days'],['14','Last 2 weeks'],['30','Last 30 days'],['year','Since September'],['custom','Choose dates']];
  root.innerHTML=`
  <div class="rp-bar"><button class="btn ghost" id="rpBack">Back</button>
    <div class="rp-seg">${P.map(([k,l])=>`<button data-p="${k}" class="${st.p===k?'on':''}">${l}</button>`).join('')}</div>
    ${st.p==='custom'?`<input type="date" id="rpFrom" value="${esc(st.from)}"> to <input type="date" id="rpTo" value="${esc(st.to)}">`:''}
    <span class="sp"></span>
    <select id="rpWho"><option value="">Whole class</option>${accs.map(a=>`<option value="${esc(a.username)}" ${st.u===a.username?'selected':''}>${esc(a.name)}</option>`).join('')}</select></div>
  <p class="rp-range">${esc(scopeName.charAt(0).toUpperCase()+scopeName.slice(1))} · ${dLong(R.from)} to ${dLong(R.to)}${st.p!=='year'?` · compared with the ${Math.round(len/DAY)} days before`:''}</p>
  ${tiles(cur,prev,accs)}
  ${briefCard(cur,R)}
  ${essayCard(cur,types)}
  ${len>=27*DAY?trendCard(cur,R):''}
  ${st.u?'':studentsCard(cur,accs)}
  ${otherCard(cur)}`;
  $('#rpBack').onclick=()=>opts.back&&opts.back();
  $$('[data-p]',root).forEach(b=>b.onclick=()=>{st.p=b.dataset.p;if(st.p==='custom'&&!st.from){const f=new Date(Date.now()-14*DAY);st.from=f.toISOString().slice(0,10);st.to=new Date().toISOString().slice(0,10);}render();});
  const f=$('#rpFrom'),t=$('#rpTo');if(f)f.onchange=()=>{st.from=f.value;render();};if(t)t.onchange=()=>{st.to=t.value;render();};
  $('#rpWho').onchange=e=>{st.u=e.target.value;render();};
  $$('[data-type]',root).forEach(b=>b.onclick=()=>{st.type=b.dataset.type;render();$('#rpEss').scrollIntoView({block:'nearest'});});
  $$('[data-stu]',root).forEach(b=>b.onclick=()=>{st.u=b.dataset.stu;render();scrollTo({top:0});});
  bindAI(cur,prev,R,types);
}

function tiles(c,p,accs){
  const ch=(a,b,unit,good)=>{if(st.p==='year')return '';if(a==null||b==null)return '<em>nothing to compare with</em>';const d=Math.round(a-b);if(!d)return '<em>same as the period before</em>';
    const up=d>0;return `<em class="${(up===(good!==false))?'up':'down'}">${up?'up':'down'} ${Math.abs(d)}${unit} on the period before</em>`;};
  const ea=avg(c.essays.map(m=>m.p.pct)),eb=avg(p.essays.map(m=>m.p.pct));
  const hw=c.marks.filter(m=>m.hk==='hw').length,pz=c.marks.filter(m=>m.hk==='pz').length;
  const t=[];
  if(!st.u)t.push(`<div class="rp-tile"><b>${c.actUsers.size} / ${accs.length}</b><span>students active</span>${ch(c.actUsers.size,p.actUsers.size,'',true)}</div>`);
  t.push(`<div class="rp-tile"><b>${c.essays.length}</b><span>written answers marked</span>${ch(c.essays.length,p.essays.length,'',true)}${c.essays.length?`<em>${hw} handwritten · ${pz} mostly pasted</em>`:''}</div>`);
  t.push(`<div class="rp-tile"><b>${pc(ea)}</b><span>average mark on written answers</span>${ch(ea,eb,' points',true)}</div>`);
  const mc=avg(c.quiz.mcq.map(q=>q.p)),ca=avg(c.quiz.calc.map(q=>q.p)),dr=avg(c.quiz.drill.map(q=>q.p));
  t.push(`<div class="rp-tile"><b>${pc(mc)}</b><span>multiple choice (${c.quiz.mcq.length} set${c.quiz.mcq.length===1?'':'s'})</span>${ch(mc,avg(p.quiz.mcq.map(q=>q.p)),' points',true)}</div>`);
  t.push(`<div class="rp-tile"><b>${pc(ca)}</b><span>calculations (${c.quiz.calc.length} set${c.quiz.calc.length===1?'':'s'})</span>${ch(ca,avg(p.quiz.calc.map(q=>q.p)),' points',true)}</div>`);
  t.push(`<div class="rp-tile"><b>${pc(dr)}</b><span>case study drills (${c.quiz.drill.length})</span>${ch(dr,avg(p.quiz.drill.map(q=>q.p)),' points',true)}</div>`);
  const passed=c.rows.filter(r=>r.passed).length;
  t.push(`<div class="rp-tile"><b>${passed}</b><span>course stages passed (${c.rows.length} ${c.rows.length===1?'try':'tries'})</span>${ch(passed,p.rows.filter(r=>r.passed).length,'',true)}</div>`);
  t.push(`<div class="rp-tile"><b>${c.blurts.length}</b><span>blurts and rapid recall${c.blurts.length?` · ${pc(avg(c.blurts.filter(b=>b.total).map(b=>b.got/b.total*100)))}`:''}</span>${ch(c.blurts.length,p.blurts.length,'',true)}</div>`);
  return `<div class="rp-tiles">${t.join('')}</div>`;
}

/* ---------- written briefing ---------- */
const KEY=(kind,R,extra)=>`nk_rp:${SPEC}:${kind}:${st.u||'class'}:${st.p}:${st.p==='custom'?st.from+st.to:new Date(R.to).toISOString().slice(0,10)}:${extra||''}`;
function cached(k){try{const v=JSON.parse(localStorage.getItem(k)||'null');return v&&v.d?v:null;}catch(e){return null;}}
function keep(k,d,n){try{localStorage.setItem(k,JSON.stringify({d,n,t:Date.now()}));}catch(e){}}
function briefCard(c,R){
  const k=KEY('brief',R),hit=cached(k);
  const stale=hit&&hit.n!==c.marks.length+c.rows.length+c.quiz.mcq.length+c.quiz.calc.length+c.quiz.drill.length;
  return `<div class="rp-card" id="rpBrief"><div class="rp-btnrow"><h2 style="margin:0">${st.u?'Briefing on '+esc(first(st.u)):'Briefing for this period'}</h2><span style="flex:1"></span>
    <button class="btn" id="rpBriefGo">${hit?'Write it again':'Write the briefing'}</button>${hit?'<button class="btn ghost" id="rpBriefCopy">Copy</button>':''}</div>
    <p class="sub" style="margin-top:6px">What happened, what the marked work shows, and what to go over in lessons. Written from the marker's comments on every answer, the course, quiz and drill results, and blurting.${hit?` Written ${new Date(hit.t).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}${stale?'. There is new work since then.':'.'}`:''}</p>
    <div id="rpBriefOut">${hit?briefHtml(hit.d):''}</div></div>`;
}
function briefHtml(b){
  const L=(a,f)=>(a||[]).filter(Boolean).map(f).join('');
  return `${b.headline?`<p class="rp-head">${esc(b.headline)}</p>`:''}<div class="rp-ai">
    ${b.happened&&b.happened.length?`<section><h3>What happened</h3><ul>${L(b.happened,x=>`<li>${esc(x)}</li>`)}</ul></section>`:''}
    ${b.seeing&&b.seeing.length?`<section><h3>What the work shows</h3><ul>${L(b.seeing,x=>`<li>${esc(x)}</li>`)}</ul></section>`:''}
    ${b.reiterate&&b.reiterate.length?`<section class="wide"><h3>${st.u?'What to go over with '+esc(first(st.u)):'Go over these in lessons'}</h3><div class="re">${(b.reiterate||[]).filter(Boolean).map((x,i)=>`<div data-resh="brief:${i}"><b>${esc(x.point)}</b>${esc(x.why||'')}${x.how?`<div class="h">In class: ${esc(x.how)}</div>`:''}<button class="lnk rs-btn" data-res="brief:${i}">Make a worksheet and slides on this</button></div>`).join('')}</div></section>`:''}
    ${b.praise&&b.praise.length?`<section><h3>Worth praising</h3><ul>${L(b.praise,x=>`<li><b>${esc(x.name)}</b>: ${esc(x.why)}</li>`)}</ul></section>`:''}
    ${b.check_on&&b.check_on.length?`<section><h3>Check on</h3><ul>${L(b.check_on,x=>`<li><b>${esc(x.name)}</b>: ${esc(x.why)}</li>`)}</ul></section>`:''}
    ${b.to_student?`<section class="wide"><h3>Message for ${esc(first(st.u))}</h3><p style="margin:0;line-height:1.6;font-size:.93rem">${esc(b.to_student)}</p></section>`:''}
  </div>${b.thin?`<p class="rp-thin">${esc(b.thin)}</p>`:''}`;
}
function briefText(b){
  const L=(t,a,f)=>a&&a.length?`${t}\n${a.map(f).join('\n')}\n\n`:'';
  return `${b.headline||''}\n\n`+L('What happened',b.happened,x=>'- '+x)+L('What the work shows',b.seeing,x=>'- '+x)+L('Go over in lessons',b.reiterate,x=>`- ${x.point}. ${x.why||''}${x.how?' In class: '+x.how:''}`)
    +L('Worth praising',b.praise,x=>`- ${x.name}: ${x.why}`)+L('Check on',b.check_on,x=>`- ${x.name}: ${x.why}`)+(b.to_student?`Message for the student\n${b.to_student}\n\n`:'')+(b.thin||'');
}
const STYLE=`Write in plain British English, the way an experienced A-level Business teacher writes notes for themselves. Short, specific sentences. No hype, no emoji, no markdown, no capitals for emphasis. Use only AQA ${SPEC} specification content. Base every point on the evidence given; if the evidence is thin, say so rather than guessing. Refer to students by the names used in the evidence (some share a first name, so they are given in full). Keep each point under 30 words.${!IS12&&window.NSTANDARD?'\n\nThe teacher\'s standard for extended answers is a real answer AQA marked 16/16. Judge the written answers against it and, when you say what to go over in lessons, describe it in terms of how that answer does it (its paragraph pattern, models used to explain steps, "This shows that" concluding sentences, and especially its conclusion pattern).\n'+NSTANDARD.block():''}`;
function evidence(c){
  const lines=[];
  byType(c.essays).forEach(t=>{lines.push(`\n${TYPE_NAME(t.k)}: ${t.list.length} marked, average ${pc(avg(t.list.map(m=>m.p.pct)))}.`);
    t.list.slice(0,45).forEach(m=>lines.push(`- ${first(m.exam)} ${m.mark}${m.hk==='hw'?' handwritten':m.hk==='pz'?' mostly pasted':''} | Q: ${String(m.full||m.question).slice(0,140)} | Went well: ${String(m.well||'').slice(0,240)} | To improve: ${String(m.improve||'').slice(0,260)}`));});
  const red=c.marks.filter(m=>m.type==='redraft');if(red.length)lines.push(`\nRedrafts: ${red.map(m=>first(m.exam)+' '+m.mark).join(', ')}`);
  const stg={};c.rows.forEach(r=>{const x=stg[r.stageTitle]=stg[r.stageTitle]||{n:0,p:0,miss:[]};x.n++;if(r.passed)x.p++;(r.missed||[]).slice(0,3).forEach(q=>x.miss.push(String(q).slice(0,90)));});
  const sl=Object.entries(stg);if(sl.length)lines.push(`\nCourse stages (tries, passed, sample of questions got wrong):\n`+sl.map(([k,x])=>`- ${k}: ${x.n} tries, ${x.p} passed${x.miss.length?'. Wrong: '+x.miss.slice(0,4).join(' / '):''}`).join('\n'));
  const q=c.quiz;lines.push(`\nMultiple choice sets: ${q.mcq.length}, average ${pc(avg(q.mcq.map(x=>x.p)))}. Calculation sets: ${q.calc.length}, average ${pc(avg(q.calc.map(x=>x.p)))}. Case study drills: ${q.drill.length}, average ${pc(avg(q.drill.map(x=>x.p)))}.`);
  if(c.blurts.length){const bt={};c.blurts.forEach(b=>{if(!b.total)return;const x=bt[b.topic||'?']=bt[b.topic||'?']||[];x.push(b.got/b.total*100);});
    lines.push(`Blurting by topic: `+Object.entries(bt).map(([k,v])=>`${k} ${pc(avg(v))}`).join('; '));}
  if(c.work.length)lines.push(`Set work finished: ${c.work.length}, average ${pc(avg(c.work.filter(w=>w.total).map(w=>w.score/w.total*100)))}.`);
  return lines.join('\n');
}
function studentLines(c){
  return (TR.data.accounts||[]).map(a=>{const u=a.username,e=c.essays.filter(m=>m.exam===u),q=k=>c.quiz[k].filter(x=>x.u===u);
    const parts=[`${first(u)}:`];if(!c.actUsers.has(u))parts.push('no activity in this period.');
    else{parts.push(`${e.length} written answers${e.length?' averaging '+pc(avg(e.map(m=>m.p.pct))):''}`);
      if(e.filter(m=>m.hk==='pz').length)parts.push(`(${e.filter(m=>m.hk==='pz').length} mostly pasted)`);
      ['mcq','calc','drill'].forEach(k=>{const x=q(k);if(x.length)parts.push(`${k} ${pc(avg(x.map(y=>y.p)))}`);});
      const r=c.rows.filter(x=>x.exam===u);if(r.length)parts.push(`course: ${r.filter(x=>x.passed).length} passed of ${r.length} tries`);}
    return parts.join(' ');}).join('\n');
}
async function writeBrief(c,prev,R){
  const out=$('#rpBriefOut'),btn=$('#rpBriefGo');btn.disabled=true;out.innerHTML='<div class="rp-wait">Reading the work and writing the briefing. This takes about 30 seconds.</div>';
  const one=!!st.u;
  const system=`You help an AQA A-level Business (${SPEC}) teacher make sense of their ${YEAR} ${one?'student':'class'}'s work on a revision website over a period of time. ${STYLE}
Reply with ONLY a JSON object, no other text:
{"headline":"one or two sentences: the overall picture for the period",
"happened":["3 to 5 short points on what ${one?'the student':'students'} actually did: how much, which tools, who was active"],
"seeing":["3 to 6 points on what the marked work shows: clear strengths and repeated weaknesses, naming the question types or topics"],
"reiterate":[{"point":"a specific thing to go over in lessons (a skill, misconception or topic)","why":"one sentence on the evidence: how often it came up and where","how":"one short, practical classroom activity or teaching move"}],
${one?`"to_student":"a short message to the student, as 'you', 4 to 6 sentences: what they did well, the two things to work on with a concrete action each",`:`"praise":[{"name":"name as given","why":"short reason"}],
"check_on":[{"name":"name as given","why":"short reason, e.g. inactive, falling marks, lots of pasting, very low marks"}],`}
"thin":"one sentence on where the evidence is thin, or an empty string"}
Give 3 to 5 items in reiterate, most important first.${one?'':' Keep praise and check_on to students the evidence really supports.'}`;
  const content=`Period: ${dLong(R.from)} to ${dLong(R.to)}.\n${one?`Student: ${nm(st.u)}`:`Class of ${(TR.data.accounts||[]).length}. Active in this period: ${c.actUsers.size}.`}
Previous period of the same length: ${prev.essays.length} written answers averaging ${pc(avg(prev.essays.map(m=>m.p.pct)))}.
${one?'':`\nStudents:\n${studentLines(c)}\n`}
Evidence:${evidence(c)}`;
  try{
    const b=await NMark.markJSON({model:MODEL,max_tokens:3000,system,messages:[{role:'user',content}]},{timeout:180000});
    keep(KEY('brief',R),b,c.marks.length+c.rows.length+c.quiz.mcq.length+c.quiz.calc.length+c.quiz.drill.length);
    render();$('#rpBrief').scrollIntoView({block:'start'});
  }catch(e){out.innerHTML=`<p class="err" style="margin-top:12px">${esc(e.message)}</p>`;btn.disabled=false;}
}

/* ---------- written answers by type ---------- */
function essayCard(c,types){
  if(!types.length)return `<div class="rp-card" id="rpEss"><h2>Written answers</h2><p class="muted">No written answers were marked in this period.</p></div>`;
  const t=types.find(x=>String(x.k)===String(st.type)),qs=groupQuestions(t.list),R=range();
  const hit=cached(KEY('type',R,t.k));
  const who=[...new Set(t.list.map(m=>m.exam))];
  return `<div class="rp-card" id="rpEss"><h2>Written answers</h2><p class="sub">Every answer marked on the site in this period, grouped by type. Click a question to see each attempt and what the marker said.</p>
    <div class="rp-chips">${types.map(x=>`<button class="rp-chip ${String(x.k)===String(st.type)?'on':''}" data-type="${x.k}">${TYPE_NAME(x.k)}<b>${x.list.length}</b></button>`).join('')}
      ${c.marks.some(m=>m.type==='redraft')?`<span class="muted" style="font-size:.85rem;align-self:center">and ${c.marks.filter(m=>m.type==='redraft').length} redraft${c.marks.filter(m=>m.type==='redraft').length>1?'s':''}</span>`:''}</div>
    <div class="rp-sum"><span><b>${t.list.length}</b> answers</span><span><b>${qs.length}</b> different questions</span>${st.u?'':`<span><b>${who.length}</b> students: ${who.map(first).map(esc).join(', ')}</span>`}<span>average ${pill(avg(t.list.map(m=>m.p.pct)))}</span></div>
    <div class="rp-btnrow" style="margin-bottom:14px"><button class="btn" id="rpTypeGo">${hit?'Write it again':`What to reteach on ${TYPE_NAME(t.k)}`}</button>${hit?'<button class="btn ghost" id="rpTypeCopy">Copy</button>':''}<span class="muted" style="font-size:.85rem">Reads the marker's comments on all ${t.list.length} answer${t.list.length>1?'s':''}.</span></div>
    <div id="rpTypeOut">${hit?typeHtml(hit.d):''}</div>
    <div class="rp-qh"><span>Question</span><span>Answers</span><span>Students</span><span>Average</span></div>
    ${qs.map((q,i)=>`<details class="rp-q"><summary><span class="t">${esc(q.full)}${q.label?`<small>${esc(q.label)}</small>`:''}</span><span class="n"><b>${q.list.length}</b></span><span class="n"><b>${q.who.length}</b></span><span class="n">${pill(q.avg)}</span></summary>
      <div class="rp-at">${q.list.slice().sort((a,b)=>T(b.t)-T(a.t)).map(m=>`<div><div class="m"><b>${esc(first(m.exam))}</b><span class="rp-pc ${pcls(m.p.pct)}">${esc(m.mark)}</span><span>${dLong(m.t)}${m.hk==='hw'?' · handwritten':m.hk==='pz'?' · typed, mostly pasted':m.hk==='ty'?' · typed':''}</span></div>
        ${m.well?`<div><span class="w">Went well:</span> ${esc(m.well)}</div>`:''}${m.improve?`<div><span class="i">To improve:</span> ${esc(m.improve)}</div>`:''}</div>`).join('')}</div></details>`).join('')}
  </div>`;
}
function typeHtml(b){
  const L=(a,f)=>(a||[]).filter(Boolean).map(f).join('');
  return `${b.summary?`<p class="rp-head" style="margin-top:0">${esc(b.summary)}</p>`:''}<div class="rp-ai" style="margin-bottom:18px">
    ${b.doing_well&&b.doing_well.length?`<section><h3>What they are doing well</h3><ul>${L(b.doing_well,x=>`<li>${esc(x)}</li>`)}</ul></section>`:''}
    ${b.weaknesses&&b.weaknesses.length?`<section><h3>Where marks are being lost</h3><ul>${L(b.weaknesses,x=>`<li><b>${esc(x.issue)}</b>${x.seen?` <span class="muted">(${esc(x.seen)})</span>`:''}${x.example?`<br><span class="muted">${esc(x.example)}</span>`:''}</li>`)}</ul></section>`:''}
    ${b.reiterate&&b.reiterate.length?`<section class="wide"><h3>Say this in lessons</h3><div class="re">${(b.reiterate||[]).filter(Boolean).map((x,i)=>`<div data-resh="type:${i}"><b>${esc(x.point)}</b>${x.how?`<div class="h">In class: ${esc(x.how)}</div>`:''}<button class="lnk rs-btn" data-res="type:${i}">Make a worksheet and slides on this</button></div>`).join('')}</div></section>`:''}
  </div>${b.questions?`<p class="rp-thin" style="margin-top:-6px;margin-bottom:16px">${esc(b.questions)}</p>`:''}`;
}
function typeText(b){
  const L=(t,a,f)=>a&&a.length?`${t}\n${a.map(f).join('\n')}\n\n`:'';
  return `${b.summary||''}\n\n`+L('Doing well',b.doing_well,x=>'- '+x)+L('Where marks are being lost',b.weaknesses,x=>`- ${x.issue}${x.seen?' ('+x.seen+')':''}${x.example?'. '+x.example:''}`)+L('Say this in lessons',b.reiterate,x=>`- ${x.point}${x.how?'. In class: '+x.how:''}`)+(b.questions||'');
}
async function writeType(t,R){
  const out=$('#rpTypeOut'),btn=$('#rpTypeGo');btn.disabled=true;out.innerHTML='<div class="rp-wait" style="margin:0 0 14px">Reading the marker\'s comments. This takes about 20 seconds.</div>';
  const system=`You help an AQA A-level Business (${SPEC}) teacher see patterns in their ${YEAR} ${st.u?'student\'s':'students\''} ${TYPE_NAME(t.k)} marked on a revision website. ${STYLE}
Reply with ONLY a JSON object, no other text:
{"summary":"one or two sentences on how these answers are going overall",
"doing_well":["2 to 4 specific things the answers are doing well"],
"weaknesses":[{"issue":"a specific, repeated reason marks are lost","seen":"how often and where, e.g. '9 of 18 answers, mostly the all-businesses questions'","example":"a short paraphrase of what the answers do"}],
"reiterate":[{"point":"what to say or reteach in lessons, written as the teacher would say it to the class","how":"a quick classroom activity to practise it"}],
"questions":"one sentence on which questions caused the most trouble and why, or an empty string"}
Give 3 to 5 weaknesses and 3 to 4 reiterate items, most important first. Only use what the comments and marks show.`;
  const content=`${TYPE_NAME(t.k)} marked from ${dLong(R.from)} to ${dLong(R.to)}: ${t.list.length} answers, average ${pc(avg(t.list.map(m=>m.p.pct)))}.\n\n`+
    t.list.slice(0,80).map(m=>`- ${first(m.exam)} ${m.mark} | Q: ${String(m.full||m.question).slice(0,160)} | Went well: ${String(m.well||'').slice(0,280)} | To improve: ${String(m.improve||'').slice(0,320)}`).join('\n');
  try{
    const b=await NMark.markJSON({model:MODEL,max_tokens:2200,system,messages:[{role:'user',content}]},{timeout:150000});
    keep(KEY('type',R,t.k),b,t.list.length);render();$('#rpEss').scrollIntoView({block:'start'});
  }catch(e){out.innerHTML=`<p class="err" style="margin:0 0 14px">${esc(e.message)}</p>`;btn.disabled=false;}
}

/* ---------- over time ---------- */
function trendCard(c,R){
  const wk=[];for(let s=R.from;s<R.to;s+=7*DAY)wk.push({s,e:Math.min(R.to,s+7*DAY),n:0,ps:[]});
  c.essays.forEach(m=>{const x=wk.find(w=>T(m.t)>=w.s&&T(m.t)<w.e);if(x){x.n++;x.ps.push(m.p.pct);}});
  const mx=Math.max(1,...wk.map(w=>w.n));
  return `<div class="rp-card"><h2>Week by week</h2><p class="sub">Written answers marked each week. The figure above each bar is that week's average mark.</p>
    <div class="rp-trend">${wk.map(w=>`<div class="wk" title="${w.n} answers"><em>${w.ps.length?pc(avg(w.ps)):''}</em><i style="height:${Math.round(w.n/mx*86)}px"></i><small>${dShort(w.s)}</small></div>`).join('')}</div></div>`;
}

/* ---------- per student ---------- */
function studentsCard(c,accs){
  const rows=accs.map(a=>{const u=a.username,e=c.essays.filter(m=>m.exam===u),q=k=>c.quiz[k].filter(x=>x.u===u).map(x=>x.p);
    return {a,u,act:c.actUsers.has(u),n:e.length,ea:avg(e.map(m=>m.p.pct)),pz:e.filter(m=>m.hk==='pz').length,hw:e.filter(m=>m.hk==='hw').length,mc:avg(q('mcq')),ca:avg(q('calc')),dr:avg(q('drill')),
      cs:c.rows.filter(r=>r.exam===u&&r.passed).length,bl:c.blurts.filter(b=>b.exam===u).length};});
  rows.sort((x,y)=>y.n-x.n||(y.ea||0)-(x.ea||0)||x.a.name.localeCompare(y.a.name));
  return `<div class="rp-card"><h2>Each student</h2><p class="sub">Click a name to see the report for just that student.</p><div class="tablewrap"><table><thead><tr><th class="l">Student</th><th>Written answers</th><th>Average</th><th>Handwritten</th><th>Mostly pasted</th><th>Multiple choice</th><th>Calculations</th><th>Drills</th><th>Course stages</th><th>Blurts</th></tr></thead><tbody>
  ${rows.map(r=>`<tr><td class="l"><button class="lnk" data-stu="${esc(r.u)}">${esc(r.a.name)}</button>${r.act?'':' <span class="muted" style="font-size:.8rem">not active</span>'}</td><td>${r.n||'<span class="muted">0</span>'}</td><td>${r.n?pill(r.ea):'–'}</td><td>${r.hw||'–'}</td><td>${r.pz?`<span class="cell a">${r.pz}</span>`:'–'}</td><td>${r.mc==null?'–':pill(r.mc)}</td><td>${r.ca==null?'–':pill(r.ca)}</td><td>${r.dr==null?'–':pill(r.dr)}</td><td>${r.cs||'–'}</td><td>${r.bl||'–'}</td></tr>`).join('')}
  </tbody></table></div></div>`;
}
function otherCard(c){
  const stg={};c.rows.forEach(r=>{const x=stg[r.stageTitle||'Course stage']=stg[r.stageTitle||'Course stage']||{n:0,p:0,who:new Set()};x.n++;if(r.passed)x.p++;x.who.add(r.exam);});
  const sl=Object.entries(stg).sort((a,b)=>(a[1].p/a[1].n)-(b[1].p/b[1].n)).slice(0,10);
  if(!sl.length)return '';
  return `<div class="rp-card"><h2>Courses</h2><p class="sub">Course stages tried in this period, the hardest first.</p><div class="tablewrap"><table><thead><tr><th class="l">Stage</th><th>Tries</th><th>Passed</th><th class="l">Students</th></tr></thead><tbody>
    ${sl.map(([k,x])=>`<tr><td class="l" style="white-space:normal">${esc(k)}</td><td>${x.n}</td><td>${x.p}</td><td class="l muted" style="white-space:normal">${[...x.who].map(first).map(esc).join(', ')}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function bindAI(c,prev,R,types){
  $('#rpBriefGo').onclick=()=>writeBrief(c,prev,R);
  const bc=$('#rpBriefCopy');if(bc)bc.onclick=()=>{const h=cached(KEY('brief',R));if(h&&navigator.clipboard)navigator.clipboard.writeText(briefText(h.d));bc.textContent='Copied';};
  const t=types.find(x=>String(x.k)===String(st.type));
  const tg=$('#rpTypeGo');if(tg&&t)tg.onclick=()=>writeType(t,R);
  /* make a resource from a point */
  const exams=window.EXAMS||[];
  const qopts=list=>groupQuestions(list).slice(0,14).map(q=>{const ex=q.list[0].ref?exams.find(e=>e.id===q.list[0].ref):null;
    return {text:q.full,ref:q.label||'Question the class used',marks:q.list[0].p.max,needs:ex?ex.needs||'':''};});
  const names=[...new Set((TR.data.accounts||[]).flatMap(a=>[a.name,a.name.split(' ')[0]]))];
  $$('[data-res]',root).forEach(b=>b.onclick=()=>{
    if(!window.Resources){alert('The resource maker did not load. Refresh the page.');return;}
    const [kind,i]=b.dataset.res.split(':');
    let item,mk=null,pool=c.essays;
    if(kind==='brief'){const h=cached(KEY('brief',R));item=h&&h.d.reiterate[+i];const m=/(\d+)[- ]mark/i.exec(item&&item.point||'');if(m){mk=+m[1];pool=c.essays.filter(e=>e.type===mk);}}
    else{const h=t&&cached(KEY('type',R,t.k));item=h&&h.d.reiterate[+i];mk=t?t.k:null;pool=t?t.list:c.essays;}
    if(!item)return;
    Resources.open(b.closest('[data-resh]'),{point:item.point,why:item.why||'',how:item.how||'',marks:mk,options:qopts(pool.length?pool:c.essays),
      comments:(pool.length?pool:c.essays).map(m=>String(m.improve||'')).filter(Boolean).slice(0,25),names});
  });
  const tc=$('#rpTypeCopy');if(tc&&t)tc.onclick=()=>{const h=cached(KEY('type',R,t.k));if(h&&navigator.clipboard)navigator.clipboard.writeText(typeText(h.d));tc.textContent='Copied';};
}

let cssDone=false;
window.Report={
  render(el,o){
    if(!cssDone){const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);cssDone=true;}
    root=el;opts=o||{};if(opts.u!==undefined&&opts.fresh){st.u=opts.u;}
    render();
  }
};
})();
