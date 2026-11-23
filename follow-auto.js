/* =====================================================================
   Automatic follow-ups (runs on the student's home page and schedule).
   Each student is looked at on their own: every topic where the evidence
   shows a real gap gets its own short follow-up set, so a student with
   more gaps gets more follow-ups. What counts as a real gap is
   Analysis.needsWork: either it shows up in two different kinds of work,
   or there is a good amount of evidence from one kind and the student is
   getting most of it wrong. A topic is not followed up again while one
   is open on it, or within a week of the last one.
   Questions are checked by a second examiner pass before anything is sent
   (see follow-gen.js). No student data is kept in this file.
   ===================================================================== */
(function(){
"use strict";
const Ac=window.Acct;if(!Ac||!Ac.on)return;
const EVERY=6*3600000,PER_RUN=3,LKEY='n8_fu_at';
function load(src){return new Promise((res,rej)=>{if(document.querySelector(`script[data-fu="${src}"]`))return res();const s=document.createElement('script');s.src=src;s.dataset.fu=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
async function libs(){
  if(!window.TAXO)await load('taxonomy.js');
  if(!window.Analysis)await load('analysis.js');
  if(!window.WorkGen)await load('workgen.js');
  if(!window.REFRESH)await load('refreshers.js').catch(()=>{});
  if(!window.FollowGen)await load('follow-gen.js');
}
function due(){try{return Date.now()-(+localStorage.getItem(LKEY)||0)>EVERY;}catch(e){return true;}}
function stamp(){try{localStorage.setItem(LKEY,String(Date.now()));}catch(e){}}

async function run(){
  if(!Ac.user||!due())return;
  stamp();
  let d;try{d=await Ac.call('/follow/mine');}catch(e){return;}
  await libs();
  const A=window.Analysis,a=A.analyse(d);
  const todo=A.needsWork(a).filter(g=>A.canFollow(g.id,d.follows,d.work,a.ev));
  const sent=[];
  for(const g of todo.slice(0,PER_RUN)){
    try{const f=await FollowGen.build(g,d.marks);await Ac.call('/follow/create',f);sent.push(g);}catch(e){}
  }
  if(!sent.length)return;
  try{sessionStorage.removeItem('n8_sched');}catch(e){}
  if(Ac.refreshSchedule)Ac.refreshSchedule().catch(()=>{});
  note(sent);
}
function note(gs){
  const e=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const n=document.createElement('div');n.setAttribute('role','status');
  n.style.cssText='position:fixed;left:50%;bottom:20px;transform:translateX(-50%);max-width:min(520px,92vw);background:#1e3a5f;color:#fff;padding:14px 18px;border-radius:10px;font:15px/1.5 "IBM Plex Sans",sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.25);z-index:10000';
  const names=gs.map(g=>`<b>${e(g.title)}</b>`);
  n.innerHTML=`${gs.length>1?'Short follow-ups':'A short follow-up'} on ${names.length>1?names.slice(0,-1).join(', ')+' and '+names[names.length-1]:names[0]} ${gs.length>1?'have':'has'} been added to your homework. These are topics that keep coming up in your work. <a href="schedule.html" style="color:#fff">Open my schedule</a> <button type="button" style="margin-left:8px;background:none;border:1px solid rgba(255,255,255,.5);color:#fff;border-radius:6px;padding:2px 8px;cursor:pointer">OK</button>`;
  n.querySelector('button').onclick=()=>n.remove();
  document.body.appendChild(n);
}
(Ac.ready||Promise.resolve()).then(()=>setTimeout(run,4000));
})();
