/* =====================================================================
   Marking labs (7138): saves the student's unfinished answer to their
   account, opens a homework question from the schedule, and sends
   marked answers to the teacher tracker. Uses the one sign-in from
   account.js. No student data is written in this file.

   The labs call YTrack.init(container) and YTrack.mark({...}).
   Homework questions come from hw-bank.js (window.HW).
   ===================================================================== */
(function(){
"use strict";
const A=window.Acct;
if(!A){window.NTrack=window.YTrack={init(){},mark(){}};return;}
const PAGE=location.pathname.split('/').pop().replace(/\.html$/,'')||'index';
const DKEY='draft:'+PAGE;
const QP=new URLSearchParams(location.search).get('q');
let bar=null,ta=null,timer=null,linked=null;

/* lab globals (declared with let in the lab's own script) */
const g=name=>{try{return (0,eval)(name);}catch(e){return undefined;}};
const setLab=(name,v)=>{try{(0,eval)(name+'=window.__ntv');}catch(e){}};
function labSet(obj){Object.entries(obj).forEach(([k,v])=>{window.__ntv=v;setLab(k);});delete window.__ntv;}

/* how the answer was written: characters typed, characters pasted, the biggest single paste, active minutes */
const blank=()=>({k:0,p:0,big:0,s:0,n:0});
let st=blank(),lastT=0,prevLen=0,clip=0;
const isTA=t=>t&&t.tagName==='TEXTAREA'&&(t.id==='essay'||t.id==='redraftText');
function watch(){
  document.addEventListener('paste',e=>{if(!isTA(e.target))return;try{clip=((e.clipboardData||window.clipboardData).getData('text')||'').length;}catch(x){clip=0;}},true);
  document.addEventListener('drop',e=>{if(!isTA(e.target))return;try{clip=(e.dataTransfer.getData('text')||'').length;}catch(x){clip=0;}},true);
  document.addEventListener('beforeinput',e=>{if(isTA(e.target))prevLen=e.target.value.length;},true);
  document.addEventListener('input',e=>{
    const t=e.target;if(!isTA(t))return;ta=t;
    if(!e.inputType){prevLen=t.value.length;return;}
    const d=t.value.length-prevLen,now=Date.now();
    if(lastT&&now-lastT<90000)st.s+=(now-lastT)/1000;lastT=now;
    if(/^insertFrom(Paste|Drop|Yank)/.test(e.inputType)){const n=Math.max(clip,d,0);st.p+=n;st.n++;if(n>st.big)st.big=n;clip=0;}
    else if(e.inputType==='insertText'||e.inputType==='insertLineBreak'||e.inputType==='insertParagraph')st.k+=Math.max((e.data||'').length,e.inputType==='insertText'?0:1);
    else if(e.inputType==='insertCompositionText')st.k+=Math.max(d,0);
    if(!t.value.trim())st=blank();
    prevLen=t.value.length;later();
  },true);
}
function curTA(){return document.getElementById('essay')||document.getElementById('redraftText');}
function photos(){
  const imgs=g('uploadedImages');const n=Array.isArray(imgs)?imgs.length:0;
  const um=document.getElementById('uploadMode2');const upOn=um&&getComputedStyle(um).display!=='none';
  const t=curTA();
  return n&&(upOn||!(t&&t.value.trim()))?n:0;
}
function how(){
  const pg=photos();if(pg)return {m:'photo',pg};
  const t=curTA(),v=t?t.value.trim():'';if(!v)return null;
  return {m:'typed',w:v.split(/\s+/).length,k:st.k,p:st.p,big:st.big,n:st.n,s:Math.round(st.s)};
}

/* which homework question is open */
function currentRef(){
  const q=g('curQ');
  if(linked&&q&&String(q).trim()===linked.q)return linked.id;
  const H=window.HW;if(H&&q){const hit=H.qs.find(x=>x.q.trim()===String(q).trim());if(hit)return hit.id;}
  return '';
}
function note(t){
  const old=document.getElementById('ntNote');if(old)old.remove();
  const p=document.createElement('p');p.id='ntNote';
  p.style.cssText='font-size:14px;margin:0 0 12px;padding:10px 14px;border-radius:10px;background:rgba(127,127,127,.08)';
  p.textContent=t;const at=document.getElementById('markContent')||document.querySelector('main')||document.body;at.parentNode.insertBefore(p,at);
}
function openQuestion(caseObj,qText,quant){
  labSet({curCase:caseObj,curQ:qText,markStep:'write'});
  if(g('curQType')!==undefined)labSet({curQType:quant?'quantitative':'non-quantitative'});
  try{const tabs=document.querySelectorAll('nav button');if(tabs.length&&typeof window.openTab==='function')window.openTab('mark');}catch(e){}
  try{(0,eval)('renderMark()');}catch(e){}
}
function findCase(id){
  const H=window.HW;if(H&&H.cases[id])return H.cases[id];
  const C=g('CASES');return Array.isArray(C)?C.find(c=>c.id===id):null;
}
/* opened from the schedule: open that question with its case study */
async function openLinked(){
  if(!QP)return;
  const H=window.HW,hq=H&&H.qs.find(x=>x.id===QP);
  if(hq){
    const c=findCase(hq.caseId);
    if(c){linked={id:hq.id,q:hq.q.trim()};openQuestion(c,hq.q,hq.quant);
      note('This question is from your schedule. Read the case study, write your answer and get it marked, and it will be ticked off.');restore();return;}
  }
  /* a question your teacher wrote in the tracker */
  try{await A.ready;const d=await A.call('/sched/mine');const it=(d.items||[]).find(x=>x.id===QP);if(!it)return;
    linked={id:it.id,q:String(it.title).trim()};
    openQuestion({id:'custom',title:'Question from your teacher',ctx:it.detail||'No case study was given with this question.',qs:[],paper:0,desc:'',tags:[]},it.title,false);
    note('This question was set by your teacher. Mark it here and it will be ticked off.');restore();
  }catch(e){}
}

/* drafts follow the student between devices */
function snapshot(){
  const t=curTA();if(!t)return;
  const d={text:t.value,st,q:String(g('curQ')||''),c:(g('curCase')||{}).id||''};
  const old=A.get(DKEY)||{};
  if(old.text===d.text&&old.q===d.q)return;
  A.set(DKEY,d);
}
function later(){clearTimeout(timer);timer=setTimeout(snapshot,800);}
function restore(){
  const d=A.get(DKEY),t=curTA();
  if(!t||!d||!d.text||t.value.trim())return;
  if(d.q&&String(g('curQ')||'')!==d.q)return;
  t.value=d.text;if(d.st)st=Object.assign(blank(),d.st);t.dispatchEvent(new Event('input',{bubbles:true}));
  const n=document.createElement('p');
  n.style.cssText='font-size:13px;opacity:.75;margin:6px 0 0';
  n.innerHTML='Your unfinished answer has been brought back. <button type="button" style="font:inherit;background:none;border:0;padding:0;text-decoration:underline;cursor:pointer;color:inherit">Start a new one</button>';
  n.querySelector('button').onclick=()=>{st=blank();t.value='';t.dispatchEvent(new Event('input',{bubbles:true}));A.set(DKEY,{text:''});n.remove();};
  t.insertAdjacentElement('afterend',n);
}
/* the lab redraws its pages; bring the draft back whenever the answer box appears */
function observe(root){
  let seen=null;
  new MutationObserver(()=>{const t=curTA();if(t&&t!==seen){seen=t;ta=t;setTimeout(restore,0);}}).observe(root,{childList:true,subtree:true});
}

/* tell the student which part they will redraft (only when marks were lost) */
function redraftNote(r,tg){
  const m=String(r.mark||'').match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+)/);if(!m)return;
  const got=+m[1],max=+m[2];if(max<6||max-got<2||got/max>=0.85)return;
  const panel=r.panel&&document.querySelector(r.panel);if(!panel)return;
  const old=panel.querySelector('.nk-rd');if(old)old.remove();
  const e=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const box=document.createElement('div');box.className='nk-rd';
  box.style.cssText='margin:18px 0 0;padding:14px 16px;border:1px solid rgba(127,127,127,.35);border-radius:10px;font-size:.92rem;line-height:1.55';
  box.innerHTML=`<b>Your redraft</b><p style="margin:6px 0">You don't need to rewrite the whole answer. Just fix the part where you lost the most marks:</p>
    ${tg.excerpt?`<p style="margin:6px 0;padding-left:10px;border-left:3px solid rgba(127,127,127,.4);font-style:italic">${e(tg.excerpt)}</p>`:''}
    <p style="margin:6px 0">${e(tg.problem)}</p>
    <p style="margin:8px 0 0">It has been added to your <a href="redraft.html">redrafts</a>. Do it without looking at the improved version above.</p>`;
  panel.appendChild(box);
}

/* The labs' Progress tab used to read only this device's history. When signed in, show the
   student's marks from their account instead, so it is the same on every device. */
const LAB_TOOL={six_marker_lab:'6-Mark Lab',nine_mark_lab:'9-Mark Lab',fifteen_mark_lab:'15-Mark Lab'};
async function accountHistory(){
  const tool=LAB_TOOL[PAGE];if(!tool||!A.user||typeof g('updateProgress')!=='function')return;
  try{
    const d=await A.call('/mymarks');
    const rows=(d.marks||[]).filter(m=>m.tool===tool).reverse().map(m=>{
      const x=String(m.mark||'').match(/(\d+(?:\.\d+)?)/);
      return {date:String(m.t||'').slice(0,10),q:String(m.question||'').slice(0,60),mark:x?+x[1]:0,level:String(m.level||'').replace(/^level\s*/i,''),fromAccount:true};
    });
    labSet({hist:rows});g('updateProgress')();
  }catch(e){}
}

window.NTrack={
  init(sel){
    A.ready.then(accountHistory);A.onChange(k=>{if(k.includes('*'))accountHistory();});
    const root=typeof sel==='string'?document.querySelector(sel):sel;
    bar=A.bar(root||document.body,{text:'You are not signed in on this browser. Sign in and your answers and marks are saved to your account, and homework is ticked off.'});
    watch();addEventListener('pagehide',snapshot);
    if(root)observe(root);
    if(QP)A.ready.then(openLinked);else A.ready.then(restore);
    A.onChange(k=>{if(k.includes(DKEY))restore();});
  },
  mark(r){
    const row={ref:currentRef(),tool:r.tool,question:String(r.question||'').slice(0,500),mark:String(r.mark==null?'':r.mark).slice(0,20),level:String(r.level||'').slice(0,60),
      well:String(r.well||'').slice(0,1200),improve:String(r.improve||'').slice(0,1200),answer:String(r.answer||'').slice(0,12000)};
    try{const h=how();if(h)row.how=JSON.stringify(h);}catch(e){}
    const tg=r.target&&String(r.target.problem||'').trim().length>=15?{skill:String(r.target.skill||'').slice(0,40),excerpt:String(r.target.excerpt||'').trim().slice(0,1500),
      problem:String(r.target.problem).trim().slice(0,600),better:String(r.target.better||'').trim().slice(0,1500)}:null;
    if(tg)row.target=tg;
    A.send('/mark',row);
    if(tg&&A.user)redraftNote(r,tg);
    if(row.ref)try{A.set(DKEY,{text:''});}catch(e){}
    if(A.on&&!A.user){
      const panel=r.panel&&document.querySelector(r.panel);
      if(panel&&!panel.querySelector('.nk-bar'))A.bar(panel,{inside:true,alert:'Your mark is saved on this device. Sign in on the home page and it will be added to your account.'});
    }
  }
};
/* the labs were written for the old Year 12 tracker; keep their calls working */
window.YTrack={
  init(sel){window.NTrack.init(sel);},
  mark(r){
    const lvl=r.level==null||r.level===''?'':(/^level/i.test(String(r.level))?String(r.level):'Level '+r.level);
    window.NTrack.mark({tool:r.tool,question:r.question,mark:(r.mark==null?'':r.mark)+(r.maxMark?'/'+r.maxMark:''),level:lvl,
      well:[r.www1,r.www2].filter(Boolean).join(' '),improve:[r.ebi1,r.ebi2].filter(Boolean).join(' '),answer:r.answer,panel:r.panel,target:r.target});
  }
};
})();
