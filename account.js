/* =====================================================================
   Student account for the 7138 site.
   One sign-in (on the home page). Once signed in, saved work follows the
   student to any device: course progress, essay drafts, marked answers
   and quiz results.

   Nothing personal is stored in this file. The sign-in is checked by the
   tracker Worker; this file only keeps the student's session token.

   Window.Acct
     user                 signed-in user {username,name} or null
     ready                promise, resolves after the first sync
     get(k) / set(k,v)    saved items that follow the student between devices
     merge(prefix, fn)    how to combine two copies of an item (e.g. course progress)
     onChange(fn)         called with the list of keys updated from the server
     send(path, body)     results for the teacher (/log, /mark, /blurt), queued if offline
     bar(el, opts)        small "Signed in as ..." strip for a page
     mountHome(el)        the sign-in panel on the home page
   ===================================================================== */
(function(){
"use strict";
const LS=(()=>{try{const k='__t';localStorage.setItem(k,'1');localStorage.removeItem(k);return localStorage;}catch(e){return null;}})();
const lget=(k,d)=>{try{const v=LS&&LS.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}};
const lset=(k,v)=>{try{LS&&LS.setItem(k,JSON.stringify(v));}catch(e){}};
const ldel=k=>{try{LS&&LS.removeItem(k);}catch(e){}};

const override=(()=>{try{return LS&&LS.getItem('n8_api');}catch(e){return null;}})();
const API=override||'https://nishkam-tracker-7138.alevelnishkam.workers.dev';
const ON=!!LS&&(!!override||/github\.io$|alevelnishkam\.workers\.dev$/.test(location.hostname));
const HOME='index.html#account';

const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const offlineMsg='Could not connect. Check your internet and try again.';

let auth=ON?lget('n8_auth',null):null;
let store=lget('n8_store',{});          // k -> {data,t}
let dirty=new Set(lget('n8_dirty',[]));
const mergers=[],listeners=[],bars=[];
let syncTimer=null,syncing=null,lastStatus='';

const saveLocal=()=>{lset('n8_store',store);lset('n8_dirty',[...dirty]);};
const active=()=>!!(auth&&auth.token&&!auth.mustChange);

async function call(path,body,opts){
  const r=await fetch(API+path,Object.assign({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},opts||{}));
  const d=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(d.error||'Something went wrong. Try again.');e.status=r.status;throw e;}
  return d;
}
async function api(path,body){
  if(!auth)throw Object.assign(new Error('Please sign in.'),{status:401});
  try{return await call(path,Object.assign({},body,{token:auth.token}));}
  catch(e){if(e.status===401){expire();}throw e;}
}
function expire(){
  auth=null;ldel('n8_auth');setStatus('');renderBars();
}

/* ---------- saved items ---------- */
function get(k){const it=store[k];return it?it.data:undefined;}
function set(k,data){
  store[k]={data,t:Date.now()};dirty.add(k);saveLocal();
  if(active()){clearTimeout(syncTimer);syncTimer=setTimeout(sync,1500);setStatus('waiting');}
}
function mergerFor(k){const m=mergers.find(m=>k.startsWith(m.prefix));return m&&m.fn;}

async function sync(){
  if(!active())return;
  if(syncing)return syncing;
  syncing=(async()=>{
    const keys=[...dirty];
    const items=keys.map(k=>({k,data:store[k]?store[k].data:null,t:store[k]?store[k].t:Date.now()}));
    try{
      const d=await api('/sync',{items});
      keys.forEach(k=>{if(store[k]&&items.find(i=>i.k===k).t===store[k].t)dirty.delete(k);});
      const changed=[];
      Object.entries(d.items||{}).forEach(([k,srv])=>{
        const loc=store[k];
        if(!loc){store[k]=srv;changed.push(k);return;}
        if(dirty.has(k))return;                       // newer local edit made during this sync
        const fn=mergerFor(k);
        if(fn&&JSON.stringify(loc.data)!==JSON.stringify(srv.data)){
          const m=fn(loc.data,srv.data);
          if(JSON.stringify(m)!==JSON.stringify(srv.data)){store[k]={data:m,t:Date.now()};dirty.add(k);}
          else store[k]=srv;
          if(JSON.stringify(m)!==JSON.stringify(loc.data))changed.push(k);
        }else if(srv.t>loc.t){store[k]=srv;changed.push(k);}
        else if(srv.t<loc.t)dirty.add(k);
      });
      saveLocal();
      if(changed.length)listeners.forEach(fn=>{try{fn(changed);}catch(e){console.error(e);}});
      setStatus(dirty.size?'waiting':'saved');
      if(dirty.size){clearTimeout(syncTimer);syncTimer=setTimeout(sync,3000);}
    }catch(e){setStatus(e.status===401?'':'offline');}
    finally{syncing=null;}
  })();
  return syncing;
}

/* ---------- results for the teacher (queued) ---------- */
const queue=()=>lget('n8_queue',[]);
const setQueue=q=>lset('n8_queue',q.slice(-60));
function send(path,body){
  if(!ON)return;
  if(path==='/mark'){try{sessionStorage.removeItem('n8_sched');}catch(e){}}
  const id=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
  const q=queue();q.push({path,body:Object.assign({},body,{qid:id}),u:auth&&auth.username});setQueue(q);
  if(active())flush();
}
let flushing=false;
async function flush(){
  if(!active()||flushing)return;
  /* only one open tab sends the queue at a time */
  if(navigator.locks&&!flush.inLock)return navigator.locks.request('n8_flush',{ifAvailable:true},async l=>{if(!l)return;flush.inLock=true;try{await flush();}finally{flush.inLock=false;}});
  flushing=true;
  try{
    let q=queue();
    while(q.length){
      const it=q[0];
      if(it.u&&it.u!==auth.username){q.shift();setQueue(q);continue;}
      try{await api(it.path,it.body);q.shift();setQueue(q);}
      catch(e){if(e.status===400||e.status===413){q.shift();setQueue(q);}else break;}
    }
  }finally{flushing=false;renderBars();}
}

/* ---------- sign in / out ---------- */
async function signIn(username,password){
  const d=await call('/login',{username:String(username).trim().toLowerCase(),password});
  const prev=lget('n8_last_user',null);
  if(prev&&prev!==d.username){store={};dirty=new Set();saveLocal();}
  auth={token:d.token,username:d.username,name:d.name,mustChange:d.mustChange};
  lset('n8_auth',auth);lset('n8_last_user',d.username);
  /* work done on this device before signing in is carried into the account */
  Object.keys(store).forEach(k=>dirty.add(k));saveLocal();
  if(active()){await sync();flush();}
  renderBars();
  return auth;
}
async function changePassword(current,next){
  await api('/password',{current,next});
  auth.mustChange=false;lset('n8_auth',auth);
  await sync();flush();renderBars();loadSched(true).then(renderBars);
}
async function signOut(){
  if(auth){
    try{if(dirty.size)await sync();}catch(e){}
    try{await call('/logout',{token:auth.token});}catch(e){}
  }
  auth=null;ldel('n8_auth');
  /* shared school computers: remove this student's saved work from the device */
  store={};dirty=new Set();saveLocal();ldel('n8_queue');
  listeners.forEach(fn=>{try{fn(['*']);}catch(e){}});
  renderBars();
}

/* ---------- this week's schedule (for the notice on every page) ---------- */
let schedInfo=null;
const CO={y12_course_analyse6_v1:1000,y12_course_assess9_v1:1100,y12_course_calculate_v1:1200};
function ukDeadline(due){const [y,m,d]=due.split('-').map(Number);const ls=mm=>{const x=new Date(Date.UTC(y,mm+1,0));x.setUTCDate(x.getUTCDate()-x.getUTCDay());return x.getTime()+3600000;};
  const t=Date.UTC(y,m-1,d,12),bst=t>=ls(2)&&t<ls(9);return Date.UTC(y,m-1,d,23,59,59)-(bst?3600000:0);}
const SELF=(document.currentScript&&document.currentScript.src)||'account.js';
let planP=null;
function plan(){if(window.SCHED_PLAN)return Promise.resolve();if(!planP)planP=new Promise(r=>{const sc=document.createElement('script');sc.src=new URL('exam-bank.js',SELF).href;sc.onload=sc.onerror=()=>r();document.head.appendChild(sc);});return planP;}
function released(i){const w=((window.SCHED_PLAN||{}).weeks||[]).find(x=>x.due===i.due);if(!w)return true;const [y,m,d]=w.release.split('-').map(Number);
  const t=Date.UTC(y,m-1,d,12),ls=mm=>{const x=new Date(Date.UTC(y,mm+1,0));x.setUTCDate(x.getUTCDate()-x.getUTCDay());return x.getTime()+3600000;};
  return Date.now()>=Date.UTC(y,m-1,d)-((t>=ls(2)&&t<ls(9))?3600000:0);}
async function loadSched(force){
  if(!active())return null;
  try{const c=JSON.parse(sessionStorage.getItem('n8_sched')||'null');if(!force&&c&&c.u===auth.username&&Date.now()-c.at<300000){schedInfo=c.v;return schedInfo;}}catch(e){}
  try{
    const d=await api('/sched/mine',{});await plan();d.items=(d.items||[]).filter(released);const now=Date.now();
    const dues=[...new Set((d.items||[]).map(i=>i.due))].sort();const due=dues.find(x=>ukDeadline(x)>=now);
    if(!due){schedInfo=null;}else{
      const mk=new Set((d.marks||[]).map(m=>m.ref)),ps=new Set((d.passes||[]).map(p=>+p.stage)),ex=new Set((d.excused||[]).map(x=>x.sched_id));
      const items=d.items.filter(i=>i.due===due);
      const isDone=i=>{if(ex.has(i.id))return true;if(i.kind==='exam')return mk.has(i.ref);if(i.kind==='choice')return String(i.ref).split(',').some(r=>mk.has(r));if(i.kind==='question')return mk.has(i.id);if(i.kind==='quiz'||i.kind==='drill'){const q=get(i.kind+':'+i.ref);return !!(q&&q.done);}
        if(i.kind==='course'&&i.ref in CO){const st=get('course:'+i.ref)||{};for(let k=1;k<=10;k++){if(!ps.has(CO[i.ref]+k)&&!(st.passed&&st.passed[k]))return false;}return true;}return false;};
      const grp=i=>i.kind==='drill'?'Data drill':i.kind==='quiz'?(/^kq/.test(i.ref)?'Knowledge quiz':'Calculations'):i.kind==='course'?'Course':
        (+i.marks===6?'6-mark questions':+i.marks===9?'9-mark questions':+i.marks===15?'15-mark questions':'Written answers');
      const order=['6-mark questions','9-mark questions','15-mark questions','Written answers','Calculations','Knowledge quiz','Data drill','Course'];const g={};
      items.forEach(i=>{const k=grp(i);g[k]=g[k]||{label:k,done:0,total:0};g[k].total++;if(isDone(i))g[k].done++;});
      schedInfo={due,total:items.length,done:items.filter(isDone).length,groups:order.filter(k=>g[k]).map(k=>g[k])};
    }
    try{sessionStorage.setItem('n8_sched',JSON.stringify({u:auth.username,at:Date.now(),v:schedInfo}));}catch(e){}
  }catch(e){}
  return schedInfo;
}
const dayName=due=>new Date(due+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short',timeZone:'UTC'});
function weekCard(){
  if(!schedInfo||!schedInfo.total)return `<div class="nk-week"><p class="nk-small" style="margin:0">No homework is due at the moment. <a href="schedule.html">My schedule</a></p></div>`;
  const pc=Math.round(100*schedInfo.done/schedInfo.total),all=schedInfo.done===schedInfo.total;
  return `<div class="nk-week"><div class="nk-week-top"><div><div class="nk-due">This week's homework, due ${esc(dayName(schedInfo.due))} at 11:59pm</div>
    <div class="nk-count">${all?'All done':`${schedInfo.done} of ${schedInfo.total} done`}</div></div><a class="nk-go" href="schedule.html">${all?'View my schedule':'Open my schedule'}</a></div>
    <span class="nk-bar-t nk-bar-big"><i style="width:${pc}%"></i></span>
    ${schedInfo.groups?`<ul class="nk-groups">${schedInfo.groups.map(g=>`<li class="${g.done===g.total?'ok':''}"><span class="nk-tick">${g.done===g.total?'✓':''}</span>${esc(g.label)}${g.total>1?` <span class="nk-small">${g.done} of ${g.total}</span>`:''}</li>`).join('')}</ul>`:''}</div>`;
}
function schedLine(){
  if(!schedInfo||!schedInfo.total)return '';
  const left=schedInfo.total-schedInfo.done;
  if(/schedule\.html$/.test(location.pathname))return '';
  const link=' <a href="schedule.html">My schedule</a>';
  return left?`Due ${dayName(schedInfo.due)}, 11:59pm: <b>${schedInfo.done} of ${schedInfo.total} done</b>.${link}`:`All done for ${dayName(schedInfo.due)}.${link}`;
}

/* ---------- status strip on each page ---------- */
const css=`.nk-bar{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;border:1px solid rgba(127,127,127,.28);border-radius:10px;padding:9px 14px;margin:0 0 16px;font-size:14px;line-height:1.45;background:rgba(127,127,127,.06)}
.nk-bar.warn{border-color:#b7791f;background:rgba(183,121,31,.12)}
.nk-bar a,.nk-bar button{color:inherit;font:inherit;background:none;border:0;padding:0;text-decoration:underline;cursor:pointer}
.nk-bar .nk-st{opacity:.7;font-size:13px}
.nk-bar .nk-sp{flex:1}`;
let cssDone=false;
function addCss(){if(cssDone)return;cssDone=true;const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);}
function setStatus(s){lastStatus=s;bars.forEach(b=>{const el=b.el.querySelector('.nk-st');if(el)el.textContent=statusText();});}
function statusText(){
  const q=queue().length;
  if(lastStatus==='offline')return 'Offline - your work is saved on this device and will sync when you are back online';
  if(lastStatus==='waiting'||q)return 'Saving...';
  if(lastStatus==='saved')return 'All work saved';
  return '';
}
function renderBar(b){
  const {el,opts}=b;
  if(!ON){el.hidden=true;return;}
  el.hidden=false;
  if(active()){
    el.className='nk-bar';
    const sl=schedLine();
    el.className='nk-bar'+(schedInfo&&schedInfo.done<schedInfo.total?' warn':'');
    el.innerHTML=`<span>Signed in as <b>${esc(auth.name)}</b></span><span class="nk-st">${esc(statusText())}</span><span class="nk-sp"></span><button type="button" class="nk-out">Sign out</button>${sl?`<span style="flex-basis:100%">${sl}</span>`:''}`;
    el.querySelector('.nk-out').onclick=()=>{if(confirm('Sign out on this device?'))signOut();};
  }else if(auth&&auth.mustChange){
    el.className='nk-bar warn';
    el.innerHTML=`<span>Choose your own password to finish signing in.</span><a href="${HOME}">Go to the home page</a>`;
  }else{
    el.className='nk-bar'+(opts.alert?' warn':'');
    el.innerHTML=`<span>${esc(opts.alert||opts.text||'Sign in once on the home page and your work here is saved to your account.')}</span><a href="${HOME}">Sign in</a>`;
  }
}
function renderBars(){bars.forEach(renderBar);}
function bar(target,opts){
  if(!ON)return null;addCss();
  const at=typeof target==='string'?document.querySelector(target):target;if(!at)return null;
  const el=document.createElement('div');el.setAttribute('aria-live','polite');
  if(opts&&opts.inside)at.prepend(el);else at.parentNode.insertBefore(el,at);
  const b={el,opts:opts||{}};bars.push(b);renderBar(b);
  return {el,alert(msg){b.opts=Object.assign({},b.opts,{alert:msg});renderBar(b);if(!active())el.scrollIntoView({behavior:'smooth',block:'center'});},
    clear(){b.opts=Object.assign({},b.opts,{alert:''});renderBar(b);}};
}

/* ---------- home page panel ---------- */
const COURSES=[['y12_course_analyse6_v1','6-mark Analyse',10,'course-6mark-analyse.html'],['y12_course_assess9_v1','9-mark Assess',10,'course-9mark-assess.html'],
  ['y12_course_calculate_v1','Calculate and use it',10,'course-calculate.html']];

/* ---------- one-off notice on the home page (shown once per student, on any device) ---------- */
/* Switched off until the wording has been approved. Set NOTICE_ON to true to show it. */
const NOTICE_ON=false;
const NOTICE={key:'notice:homework-7138-v1',html:`<h2>Weekly homework</h2>
<p>The homework system on the A-level Business site is now up and running. Click <b>My schedule</b> on the home page to see what is due.</p>
<h3>Every week you will have</h3>
<ul><li><b>Two 6-mark, two 9-mark and two 15-mark questions</b> on topics we have already covered. Each one opens in the right marking tool with its case study. Get them marked on the site by typing them or uploading photos of your handwritten answers.</li>
<li><b>15 calculation questions.</b> Work out the answer, then decide what it means for the business.</li>
<li><b>A data drill</b> (about 15 mins). Mostly clicking, using a case study: choose the calculations worth doing, work them out, and decide which question you would use them in. Using data well is a big part of every paper.</li>
<li><b>A 20-question knowledge quiz.</b> Your first answer counts.</li></ul>
<p>There is no homework in KAT weeks.</p>
<h3>Deadline</h3>
<p><b>Wednesday 11:59pm</b> every week. The first one is <b>Wednesday 9 December</b>.</p>
<p>Anything missing means a Friday SLT after school. If you are absent, or if anything prevents you from meeting a deadline, you need to tell me in advance so I can decide on next steps.</p>
<p>Everything is ticked off automatically once it is done, so you can always see where you are. I can see this too, including whether typed answers were written or pasted in (if you have used AI).</p>
<p>Any problems signing in, message me.</p>`};
let noticeShown=false;
function showNotice(){
  if(!NOTICE_ON||noticeShown||!active()||auth.mustChange||get(NOTICE.key))return;noticeShown=true;
  const st=document.createElement('style');st.textContent=`.nk-ov{position:fixed;inset:0;z-index:9999;background:rgba(10,15,25,.55);display:flex;align-items:center;justify-content:center;padding:16px}
.nk-modal{background:#fff;color:#1a1a1a;max-width:620px;width:100%;max-height:88vh;overflow:auto;border-radius:14px;padding:24px 26px;font:15px/1.55 "IBM Plex Sans",system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.nk-modal h2{font:400 1.6rem "DM Serif Display",Georgia,serif;margin:0 0 10px;color:#0E2A47}.nk-modal h3{font-size:1rem;margin:16px 0 4px}
.nk-modal p{margin:0 0 8px}.nk-modal ul{margin:0 0 8px;padding-left:20px}.nk-modal li{margin-bottom:4px}
.nk-modal button{margin-top:12px;padding:10px 22px;border:0;border-radius:9px;background:#0E2A47;color:#fff;font:600 15px "IBM Plex Sans",system-ui,sans-serif;cursor:pointer}
@media (prefers-color-scheme:dark){.nk-modal{background:#172133;color:#e9ecf2}.nk-modal h2{color:#cfe0f5}.nk-modal button{background:#cfe0f5;color:#0e1420}}`;
  document.head.appendChild(st);
  const ov=document.createElement('div');ov.className='nk-ov';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');
  ov.innerHTML=`<div class="nk-modal">${NOTICE.html}<button type="button">Got it</button></div>`;
  document.body.appendChild(ov);
  const b=ov.querySelector('button');try{b.focus({preventScroll:true});}catch(e){}ov.querySelector('.nk-modal').scrollTop=0;
  b.onclick=()=>{set(NOTICE.key,{seen:new Date().toISOString()});ov.remove();};
}
function mountHome(target){
  if(!ON)return;
  const el=typeof target==='string'?document.querySelector(target):target;if(!el)return;
  el.hidden=false;
  const draw=async()=>{
    if(!auth){
      el.innerHTML=`<div class="nk-home"><h3>Sign in</h3><p>Use the username and password your teacher gave you. You only need to sign in once on each device. After that, your course progress, essays and marks are saved to your account and carry on from any computer or phone.</p>
        <form id="nkSignIn" autocomplete="on"><label>Username<input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
        <label>Password<input name="password" type="password" autocomplete="current-password" required></label><button type="submit">Sign in</button></form><p class="nk-err" aria-live="polite"></p></div>`;
      el.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=e.target,btn=f.querySelector('button'),err=el.querySelector('.nk-err');
        btn.disabled=true;err.textContent='';
        try{await signIn(f.username.value,f.password.value);draw();}
        catch(x){err.textContent=x.message==='Failed to fetch'?offlineMsg:x.message;btn.disabled=false;}};
      return;
    }
    if(auth.mustChange){
      el.innerHTML=`<div class="nk-home"><h3>Choose your own password</h3><p>The password your teacher gave you only works once. Choose a new one that you will remember, at least 8 characters. Don't share it with anyone.</p>
        <form id="nkPw"><label>Password from your teacher<input name="current" type="password" autocomplete="current-password" required></label>
        <label>New password<input name="next" type="password" autocomplete="new-password" minlength="8" required></label>
        <label>New password again<input name="again" type="password" autocomplete="new-password" minlength="8" required></label><button type="submit">Save password</button></form>
        <p class="nk-err" aria-live="polite"></p><p class="nk-small">Signed in as ${esc(auth.username)}. <button type="button" class="nk-link" id="nkCancel">Use a different account</button></p></div>`;
      el.querySelector('#nkCancel').onclick=async()=>{await signOut();draw();};
      el.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=e.target,btn=f.querySelector('button'),err=el.querySelector('.nk-err');
        err.textContent='';if(f.next.value!==f.again.value){err.textContent='The two new passwords are different.';return;}
        btn.disabled=true;
        try{await changePassword(f.current.value,f.next.value);draw();}
        catch(x){err.textContent=x.status===401?'Please sign in again.':x.message==='Failed to fetch'?offlineMsg:x.message;btn.disabled=false;if(x.status===401)draw();}};
      return;
    }
    const prog=COURSES.map(([k,t,n,href])=>{const s=get('course:'+k)||{};const p=Object.keys(s.passed||{}).filter(x=>s.passed[x]).length;
      return `<li><a href="${href}">${esc(t)}</a><span class="nk-bar-t"><i style="width:${p/n*100}%"></i></span><span class="nk-small">${p?`${p} of ${n}`:'Not started'}</span></li>`;}).join('');
    el.innerHTML=`<div class="nk-home"><div class="nk-head"><h3>Hello, ${esc(String(auth.name||'').split(' ')[0])}</h3><span class="nk-small">${esc(auth.username)}</span>
      <span class="nk-small nk-st2">${esc(statusText())}</span><button type="button" class="nk-link" id="nkOut">Sign out</button></div>
      <div id="nkWeek">${weekCard()}</div>
      <p class="nk-small" id="nkWork" style="margin:14px 0 0"></p>
            <div class="nk-cols" style="margin-top:22px"><div><h4>Courses</h4><ul class="nk-prog">${prog}</ul></div>
      <div><h4>Your marked answers</h4><div id="nkMarks" class="nk-small">Loading...</div></div></div></div>`;
    el.querySelector('#nkOut').onclick=async()=>{if(confirm('Sign out on this device?')){await signOut();draw();}};
    ready.then(()=>setTimeout(showNotice,300));
    if(!schedInfo||!schedInfo.groups)loadSched(true).then(()=>{const h=el.querySelector('#nkWeek');if(h)h.innerHTML=weekCard();renderBars();});

    api('/work/mine',{}).then(d=>{const el2=el.querySelector('#nkWork');if(!el2)return;const todo=(d.work||[]).filter(w=>w.source==='teacher'&&w.status!=='done');
      el2.innerHTML=todo.length?`<b>Work from your teacher: ${todo.length} to do.</b> <a href="practice.html">Go to practice</a>`:`<a href="practice.html">Practice</a>: make questions on your gaps or any topic you have covered.`;}).catch(()=>{});
    try{const d=await api('/mymarks',{});const m=el.querySelector('#nkMarks');if(!m)return;
      m.innerHTML=d.marks&&d.marks.length?`<ul class="nk-marks">${d.marks.slice(0,8).map(x=>`<li><details><summary><b>${esc(x.mark)}</b> ${esc(x.tool)} <span class="nk-small">${new Date(x.t).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span></summary>
        <p class="nk-q">${esc(x.question)}</p>${x.well?`<p><b>What went well:</b> ${esc(x.well)}</p>`:''}${x.improve?`<p><b>To improve:</b> ${esc(x.improve)}</p>`:''}</details></li>`).join('')}</ul>`
        :'Nothing marked yet. Answers you mark in the 6, 9 and 15-mark labs will appear here.';}
    catch(e){const m=el.querySelector('#nkMarks');if(m)m.textContent=auth?'Could not load your marks just now.':'';if(!auth)draw();}
  };
  draw();
  listeners.push(()=>{if(active()&&!el.querySelector('input:focus'))draw();});
  if(location.hash==='#account')setTimeout(()=>el.scrollIntoView({block:'start'}),50);
}

/* ---------- keep in sync ---------- */
let readyResolve;const ready=new Promise(r=>{readyResolve=r;});
async function start(){
  if(!active()){readyResolve();return;}
  try{const me=await api('/me',{});auth.name=me.name;auth.mustChange=me.mustChange;lset('n8_auth',auth);}catch(e){}
  await sync();flush();readyResolve();renderBars();
  loadSched().then(()=>{renderBars();const h=document.getElementById('nkSched');if(h)h.innerHTML=schedLine();});
}
if(ON){
  addEventListener('online',()=>{sync();flush();});
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'&&active()&&dirty.size){
      const keys=[...dirty];
      try{fetch(API+'/sync',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},
        body:JSON.stringify({token:auth.token,items:keys.map(k=>({k,data:store[k]?store[k].data:null,t:store[k]?store[k].t:Date.now()}))})});}catch(e){}
    }else if(document.visibilityState==='visible')sync();
  });
  setInterval(()=>{if(document.visibilityState==='visible'){sync();flush();}},90000);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
}else readyResolve();

window.Acct={
  get on(){return ON;},
  get user(){return active()?{username:auth.username,name:auth.name}:null;},
  ready,get,set,send,sync,signOut,bar,mountHome,
  call(path,body){return api(path,body||{});},
  refreshSchedule(){return loadSched(true).then(()=>renderBars());},
  merge(prefix,fn){mergers.push({prefix,fn});},
  onChange(fn){listeners.push(fn);}
};
})();
