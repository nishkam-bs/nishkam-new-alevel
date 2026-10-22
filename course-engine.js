/* Shared engine for the revision courses. Each course page sets window.COURSE and then loads this file. */
(function(){
"use strict";
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};

/* =====================================================================
   COURSE SETTINGS (each course page sets window.COURSE before loading this file)
   ===================================================================== */
const C=window.COURSE;
const STAGES=C.stages;
const OFFSET=C.offset||0;            // stage numbers in the sheet: course offset + stage (0, 100, 200...)
const countOf=s=>s.type==='timed'?(s.count||12):s.items.length;

document.body.insertAdjacentHTML('afterbegin',`<canvas id="burst" aria-hidden="true"></canvas>
<div id="mapView">
  <header class="hero">
    <canvas id="net" aria-hidden="true"></canvas>
    <div class="wrap">
      <div class="kicker">${C.hero.kicker}</div>
      <h1>${C.hero.title}</h1>
      <p class="lead">${C.hero.lede}</p>
      <div class="overall"><div class="bar"><i id="overallBar"></i></div><span id="overallTxt"></span></div>
      <div id="authBox" hidden></div>
    </div>
  </header>
  <section class="map">
    <div class="wrap" style="position:relative">
      <svg class="path" id="pathSvg" aria-hidden="true"></svg>
      <div class="nodes" id="nodes"></div>
    </div>
  </section>
  <footer><div class="wrap"><a href="courses.html" style="color:var(--muted)">All courses</a> · <a href="index.html" style="color:var(--muted)">Main site</a><br>Nishkam School West London · Man neeva, mat uchi<br><button id="resetAll">Reset my progress</button></div></footer>
</div>
<div id="stageView" hidden>
  <div class="stagebar">
    <div class="wrap">
      <button class="back" id="backBtn">← Course map</button>
      <div class="title" id="sTitle"></div>
      <div class="stats"><span>Score <b id="sScore">0</b></span><span>Streak <b id="sStreak">0</b></span><span class="tm"><b id="sTime">0:00</b></span></div>
    </div>
    <div class="wrap"><div class="pips" id="pips"></div></div>
  </div>
  <main class="stage"><div class="wrap" id="stageBody"></div></main>
</div>`);

/* =====================================================================
   STATE
   ===================================================================== */
/* every question gets a label so the teacher dashboard can show which ones are missed */
STAGES.forEach(s=>s.items.forEach((it,i)=>{it._id=s.id+'.'+(i+1);}));

/* 7138 site: tracking is off until the Year 12 sign-in is set up. Progress is saved on the device only.
   Do not switch this on with the 7132 tracker: it would log Year 12 students into the Year 13 sheet. */
const TRACKING_ON=false;
const HOLIDAY_CODE='';
const TRACK=TRACKING_ON&&/github\.io$/.test(location.hostname);
const API='https://nishkam-tracker.alevelnishkam.workers.dev';
const KEY=C.key;
const blank=()=>({best:{},passed:{},draft:''});
let auth=null;
try{auth=JSON.parse(localStorage.getItem('epc_auth')||'null');}catch(e){}
if(!TRACK)auth=null;
const skey=()=>auth?KEY+'_'+auth.exam:KEY;
let state=blank();
function loadState(){state=blank();try{const r=localStorage.getItem(skey());if(r)state=Object.assign(state,JSON.parse(r));}catch(e){}}
loadState();
const teacher = !TRACK && location.hash==='#teacher';
function save(){try{localStorage.setItem(skey(),JSON.stringify(state));}catch(e){}}
const isUnlocked=id=>teacher||((!TRACK||auth)&&(id===1||!!state.passed[id-1]));

async function api(path,body){
  const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));
  if(r.status===401&&path!=='/login'){signOut('Your sign-in has expired. Please sign in again.');throw new Error('auth');}
  if(!r.ok)throw new Error(d.error||'Something went wrong');
  return d;
}
function signOut(msg){auth=null;try{localStorage.removeItem('epc_auth');}catch(e){}loadState();renderAuth(msg);renderMap();}
async function syncProgress(){
  if(!auth)return;
  try{const d=await api('/progress',{token:auth.token});
    /* the sheet stores every course together; keep only this course's stages */
    const mine=k=>{k=+k;return k>OFFSET&&k<OFFSET+100?k-OFFSET:null;};
    Object.entries(d.best||{}).forEach(([k,v])=>{const s=mine(k);if(s&&(state.best[s]==null||v>state.best[s]))state.best[s]=v;});
    Object.keys(d.passed||{}).forEach(k=>{const s=mine(k);if(s)state.passed[s]=true;});save();renderMap();}catch(e){}
}
function pending(){try{return JSON.parse(localStorage.getItem('epc_pending_'+(auth&&auth.exam))||'[]');}catch(e){return [];}}
function setPending(a){try{localStorage.setItem('epc_pending_'+(auth&&auth.exam),JSON.stringify(a));}catch(e){}}
async function flush(){
  if(!auth)return;let q=pending();
  while(q.length){try{await api('/log',Object.assign({token:auth.token},q[0]));q.shift();setPending(q);}catch(e){break;}}
  const el=$('#syncTxt');if(el)el.textContent=q.length?`${q.length} result${q.length>1?'s':''} waiting to send`:'Progress saved';
}
function logResult(row){if(!TRACK||!auth)return;const q=pending();q.push(row);setPending(q);flush();}

function renderAuth(msg){
  const box=$('#authBox');if(!TRACK){box.hidden=true;return;}box.hidden=false;
  if(auth){box.innerHTML=`<div class="who">Signed in as <b>${esc(auth.name)}</b> <span class="sync" id="syncTxt"></span><button id="soBtn">Not you? Sign out</button></div>`;$('#soBtn').onclick=()=>signOut();return;}
  box.innerHTML=`<form class="signin" id="siForm"><h3>Sign in to start</h3><p>Enter your exam number. Your progress is saved, so you can carry on from any device.</p>
    <div class="row"><input class="txt" id="siExam" inputmode="numeric" autocomplete="off" placeholder="Exam number" aria-label="Exam number"><button class="btn" type="submit">Sign in</button></div>
    <div class="err" aria-live="polite">${msg?esc(msg):''}</div></form>`;
  $('#siForm').onsubmit=async e=>{e.preventDefault();const btn=$('#siForm .btn'),err=$('#siForm .err');btn.disabled=true;err.textContent='';
    try{const d=await api('/login',{exam:$('#siExam').value.trim(),code:HOLIDAY_CODE});
      auth={token:d.token,name:d.name,exam:d.exam};try{localStorage.setItem('epc_auth',JSON.stringify(auth));}catch(x){}
      loadState();renderAuth();renderMap();await syncProgress();flush();
    }catch(x){err.textContent=x.message==='Failed to fetch'?'Could not connect. Check your internet and try again.':x.message;btn.disabled=false;}};
}

/* =====================================================================
   HERO NETWORK
   ===================================================================== */
const cv=$('#net'),cx=cv.getContext('2d');let W,H,pts=[],mouse={x:-999,y:-999},running=true;
function size(){const r=cv.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;cv.width=W*d;cv.height=H*d;cx.setTransform(d,0,0,d,0,0);
  const n=Math.round(Math.min(80,W*H/12000));pts=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.35,vy:(Math.random()-.5)*.35,k:Math.random()<.12?'s':Math.random()<.14?'e':'c'}));}
function draw(){
  if(!running)return;
  cx.clearRect(0,0,W,H);const cs={s:css('--start'),e:css('--end'),c:css('--chain')},lc=css('--muted');
  for(const p of pts){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;const dx=p.x-mouse.x,dy=p.y-mouse.y,d=Math.hypot(dx,dy);if(d<120&&d>0){p.x+=dx/d;p.y+=dy/d;}}
  for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const a=pts[i],b=pts[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<125){cx.globalAlpha=(1-d/125)*.28;cx.strokeStyle=lc;cx.beginPath();cx.moveTo(a.x,a.y);cx.lineTo(b.x,b.y);cx.stroke();}}
  for(const p of pts){cx.globalAlpha=.75;cx.fillStyle=cs[p.k];cx.beginPath();cx.arc(p.x,p.y,p.k==='c'?1.8:3,0,7);cx.fill();}
  cx.globalAlpha=1;if(!reduce)requestAnimationFrame(draw);
}
size();draw();addEventListener('resize',()=>{size();drawPath();});
const hero=$('.hero');hero.addEventListener('pointermove',e=>{const r=cv.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;});hero.addEventListener('pointerleave',()=>{mouse.x=mouse.y=-999;});

/* =====================================================================
   MAP
   ===================================================================== */
function renderMap(){
  const box=$('#nodes');box.innerHTML='';
  let current=STAGES.find(s=>isUnlocked(s.id)&&!state.passed[s.id]);
  STAGES.forEach(s=>{
    const un=isUnlocked(s.id),ps=!!state.passed[s.id];
    const d=document.createElement('div');d.className='node reveal'+(un?'':' locked')+(ps?' passed':'')+(current&&current.id===s.id?' current':'');
    const best=state.best[s.id];
    const cnt=countOf(s);const status=TRACK&&!auth?'Sign in first':!un?'Locked':ps?(s.type==='write'?'Complete':`Passed · ${best}/${cnt}`):(best!=null?`Best ${best}/${cnt}`:'Ready');
    d.innerHTML=`<button class="ncard" ${un?'':'aria-disabled="true"'}><div class="top"><span class="n">${ps?'✓':s.id}</span><span class="st">${status}</span></div><h3>${esc(s.title)}</h3><p>${esc(s.blurb)}</p></button>`;
    const c=d.querySelector('.ncard');
    c.onclick=()=>{if(un)openStage(s.id);else if(TRACK&&!auth){const i=$('#siExam');if(i){i.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});i.focus({preventScroll:true});}}else{c.animate([{transform:'translateX(-5px)'},{transform:'translateX(5px)'},{transform:'none'}],{duration:300});}};
    if(fine&&!reduce){c.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform=`rotateX(${-y*10}deg) rotateY(${x*14}deg) translateZ(10px)`;});c.addEventListener('pointerleave',()=>c.style.transform='');}
    box.append(d);
  });
  const n=Object.keys(state.passed).filter(k=>state.passed[k]).length;
  $('#overallBar').style.width=(n/STAGES.length*100)+'%';
  $('#overallTxt').textContent=n===STAGES.length?'All stages passed':`${n} of ${STAGES.length} stages passed`;
  requestAnimationFrame(()=>{drawPath();$$('.reveal').forEach(el=>io.observe(el));});
}
function drawPath(){
  const svg=$('#pathSvg'),nodes=$$('.node');if(!nodes.length||innerWidth<760){svg.innerHTML='';return;}
  const wr=svg.parentElement.getBoundingClientRect();
  const P=nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.left-wr.left+r.width/2,y:r.top-wr.top+r.height/2};});
  const w=wr.width,h=P[P.length-1].y+20;svg.setAttribute('width',w);svg.setAttribute('height',h);svg.style.width=w+'px';svg.style.top='0';svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  let d=`M${P[0].x},${P[0].y}`;for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i],my=(a.y+b.y)/2;d+=` C${a.x},${my} ${b.x},${my} ${b.x},${b.y}`;}
  const passedN=STAGES.filter(s=>state.passed[s.id]).length;
  let dd=`M${P[0].x},${P[0].y}`;for(let i=1;i<=Math.min(passedN,P.length-1);i++){const a=P[i-1],b=P[i],my=(a.y+b.y)/2;dd+=` C${a.x},${my} ${b.x},${my} ${b.x},${b.y}`;}
  svg.innerHTML=`<path class="track" d="${d}"/>${passedN?`<path class="done-line" id="doneLine" d="${dd}"/>`:''}`;
  const dl=$('#doneLine');if(dl&&!reduce){const L=dl.getTotalLength();dl.style.strokeDasharray=L;dl.style.strokeDashoffset=L;dl.getBoundingClientRect();dl.style.transition='stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1)';dl.style.strokeDashoffset=0;}
}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:.1});

/* =====================================================================
   STAGE ENGINE
   ===================================================================== */
let S=null; // current run
let timerId=null;
function openStage(id){
  const st=STAGES.find(s=>s.id===id);
  if(st.type==='timed'){
    const pool=st.poolFrom.flatMap(id=>{const src=STAGES.find(x=>x.id===id);return src.items.map(x=>Object.assign({_k:src.type,_from:src},x));});
    st.items=shuffle(pool).slice(0,countOf(st));
  }
  S={st,i:-1,score:0,streak:0,results:[],t0:0,cd:null};
  $('#mapView').hidden=true;$('#stageView').hidden=false;running=false;
  $('#sTitle').textContent=`Stage ${st.id} · ${st.title}`;
  $('#pips').innerHTML=st.type==='write'?'':st.items.map(()=>'<i></i>').join('');
  updStats();scrollTo(0,0);
  const body=$('#stageBody');
  body.innerHTML=`<div class="item"><div class="src">Stage ${st.id} of ${STAGES.length}</div><h2>${esc(st.title)}</h2>
    <div class="card teach">${st.teach}${st.type==='write'?'':`<p class="passline">${countOf(st)} questions. Pass mark: <b>${st.pass}</b>.</p>`}</div>
    <div class="next"><button class="btn" id="go">${st.type==='write'?'Open the question':'Start'}</button></div></div>`;
  $('#go').onclick=()=>{S.t0=Date.now();clearInterval(timerId);timerId=setInterval(tick,1000);nextItem();};
}
function tick(){if(!S)return;const s=Math.floor((Date.now()-S.t0)/1000);$('#sTime').textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function updStats(){$('#sScore').textContent=S.score;$('#sStreak').textContent=S.streak;$$('#pips i').forEach((p,i)=>{p.className=S.results[i]===true?'ok':S.results[i]===false?'no':i===S.i?'cur':'';});}
function record(ok){if(S.cd){clearTimeout(S.cd);S.cd=null;const b=$('.cd i');if(b)b.style.animationPlayState='paused';}S.results[S.i]=ok;if(ok){S.score++;S.streak++;}else S.streak=0;updStats();}
function nextItem(){
  S.i++;updStats();
  if(S.i>=S.st.items.length){finish();return;}
  const it=S.st.items[S.i],body=$('#stageBody');
  body.innerHTML='';const wrap=document.createElement('div');wrap.className='item';body.append(wrap);
  scrollTo({top:0,behavior:reduce?'auto':'smooth'});
  ({spot:itemSpot,drift:itemDrift,build:itemBuild,weak:itemWeak,mcq:itemMcq,write:itemWrite,calc:itemCalc,timed:itemTimed})[S.st.type](it,wrap);
}
function nextBtn(wrap,label){const n=document.createElement('div');n.className='next';const b=document.createElement('button');b.className='btn';b.textContent=label||(S.i===S.st.items.length-1?'See my result':'Next');b.onclick=nextItem;n.append(b);wrap.append(n);setTimeout(()=>b.focus({preventScroll:true}),50);
  b.scrollIntoView({behavior:reduce?'auto':'smooth',block:'nearest'});}
function fb(wrap,ok,title,text,extra){const f=document.createElement('div');f.className='fb '+(ok?'ok':'no');f.innerHTML=`<b class="t">${title}</b>${text}${extra?`<div class="ex">${extra}</div>`:''}`;wrap.append(f);}

/* ---- spot ---- */
function itemSpot(it,wrap){
  const P=Object.assign({s:'Tap the <b class="s">start point</b>.',e:'Now tap the <b class="e">end point</b>.',wrongS:'Not that. What is the business doing, or what is happening to it?',wrongSE:'That is where the chain finishes. What are you told to analyse?',wrongE:'Not that. Where does the question want the chain to finish? Read to the end.'},S.st.prompts||{});
  const seq=S.st.seq||['s','e'];
  wrap.innerHTML=`<span class="src">${esc(it.src)}</span><div class="card"><div class="qtext"></div><div class="prompt" aria-live="polite">${P.s}</div></div>`;
  const t=$('.qtext',wrap),pr=$('.prompt',wrap);let stage='s',clean=true;
  it.parts.forEach(p=>{
    if(typeof p==='string')p.split(/(\s+)/).forEach(w=>{if(!w.trim()){t.append(w);return;}const b=document.createElement('button');b.className='chip';b.textContent=w;b.dataset.k='x';t.append(b);});
    else{const b=document.createElement('button');b.className='chip';b.textContent=p[0];b.dataset.k=p[1];t.append(b);}
  });
  t.onclick=e=>{const b=e.target.closest('.chip');if(!b||stage==='done')return;
    if(b.dataset.k===stage){b.classList.add(stage==='s'?'st':'en');
      if(stage==='s'&&seq.includes('e')){stage='e';pr.innerHTML=P.e;}
      else{stage='done';pr.textContent='';record(clean);fb(wrap,clean,clean?'Correct':'Got there, but not first time',esc(it.note));nextBtn(wrap);}}
    else{clean=false;b.classList.remove('bad');void b.offsetWidth;b.classList.add('bad');
      pr.innerHTML=stage==='s'?(b.dataset.k==='e'?P.wrongSE:P.wrongS):P.wrongE;}
  };
}
/* ---- drift ---- */
function itemDrift(it,wrap){
  const D=(it._from||S.st);const lab=D.labels||['Reached the end point','Drifted'];
  const body=it.text!=null?esc(it.text):`${esc(it.lead)}<span class="tail">${esc(it.tail)}</span>`;
  wrap.innerHTML=`<span class="src">${esc(it.src)}</span><div class="qbox">${esc(it.q)}</div><p style="font-size:.88rem;color:var(--muted);margin-bottom:8px">${esc(D.showLabel||"The end of a student's chain:")}</p><div class="ending">"${body}"</div>
  <div class="choices two"><button class="opt" data-v="1">${esc(lab[0])}</button><button class="opt" data-v="0">${esc(lab[1])}</button></div>`;
  $$('.opt',wrap).forEach(b=>b.onclick=()=>{const pick=b.dataset.v==='1',ok=pick===it.ok;$$('.opt',wrap).forEach(x=>{x.disabled=true;if((x.dataset.v==='1')===it.ok)x.classList.add('right');else x.classList.add('dim');});if(!ok)b.classList.replace('dim','wrong');
    record(ok);fb(wrap,ok,ok?'Correct':'Not this time',esc(it.why));nextBtn(wrap);});
}
/* ---- build ---- */
function itemBuild(it,wrap){
  const all=shuffle([...it.cards,it.decoy]);let placed=[null,null,null,null],checks=0,solved=false;
  wrap.innerHTML=`<span class="src">${esc(it.src)}</span><div class="qbox">${esc(it.q)}</div>${it.table||''}
   <div class="board"><div class="anchor s"><b>Start</b>${esc(it.start)}</div>${[0,1,2,3].map(i=>`<div class="slot" data-i="${i}"><span class="k">${i+1}</span><span class="c">Empty</span></div>`).join('')}<div class="anchor e"><b>End</b>${esc(it.end)}</div></div>
   <div class="pool"></div><div class="next" style="align-items:center"><button class="btn small" data-a="check" disabled>Check my order</button><button class="btn small ghost" data-a="clear">Clear</button><span class="attempts">2 checks left</span></div><div class="fbz"></div>`;
  const pool=$('.pool',wrap),chk=$('[data-a=check]',wrap);
  function render(mode){
    pool.innerHTML='';all.forEach(c=>{const b=document.createElement('button');b.className='pick'+(placed.includes(c.id)?' used':'');b.textContent=c.t;b.onclick=()=>{const i=placed.indexOf(null);if(i<0||solved)return;placed[i]=c.id;render();};pool.append(b);});
    $$('.slot',wrap).forEach((s,i)=>{const id=placed[i],c=all.find(x=>x.id===id);
      s.className='slot'+(id?' filled':'')+(mode&&id?(it.order[i]===id?' right':' wrong'):'');
      s.querySelector('.c').innerHTML=c?`<span>${esc(c.t)}${mode==='solved'?`<span class="w">${esc(c.w)}</span>`:''}</span>`:'Empty';
      s.onclick=()=>{if(!id||solved)return;placed[i]=null;render();};});
    chk.disabled=solved||placed.includes(null)||checks>=2;
  }
  $('[data-a=clear]',wrap).onclick=()=>{if(solved)return;placed=[null,null,null,null];render();};
  chk.onclick=()=>{checks++;const right=placed.filter((id,i)=>it.order[i]===id).length;$('.attempts',wrap).textContent=(2-checks)+(2-checks===1?' check left':' checks left');
    if(right===4){solved=true;render('solved');record(checks===1);fb($('.fbz',wrap),true,checks===1?'Correct first time':'Correct on the second check',`The trap card was: "${esc(it.decoy.t)}". ${esc(it.decoy.w)}`,'Read the "why" under each link. That reasoning is what you write between the steps.');pool.hidden=true;nextBtn(wrap);}
    else if(checks>=2){solved=true;placed=it.order.slice();render('solved');record(false);fb($('.fbz',wrap),false,'Here is the order',`The trap card was: "${esc(it.decoy.t)}". ${esc(it.decoy.w)}`,'Each step has to make the next one possible. Read the "why" under each link.');pool.hidden=true;nextBtn(wrap);}
    else{render('check');const decoyIn=placed.includes(it.decoy.id);$('.fbz',wrap).innerHTML=`<div class="fb no"><b class="t">${right} of 4 in the right place</b>${decoyIn?'One of your cards does not belong in this chain at all. ':''}Tap the red ones to send them back and try again.</div>`;}
  };
  render();
}
/* ---- weak ---- */
function itemWeak(it,wrap){
  let phase='find',clean=true;
  wrap.innerHTML=`<span class="src">${esc(it.src)}</span><div class="qbox">${esc(it.q)}</div><p class="ph" style="font-size:.9rem;color:var(--muted);margin-bottom:10px">Tap the weak step.</p>
   <div class="sents">${it.s.map((x,i)=>`<button class="sent" data-i="${i}"><span class="k">${i+1}</span><span class="tx">${esc(x)}</span></button>`).join('')}</div><div class="fx"></div>`;
  $$('.sent',wrap).forEach(b=>b.onclick=()=>{if(phase!=='find')return;const i=+b.dataset.i;
    if(i===it.bad){phase='fix';$$('.sent',wrap).forEach(x=>x.disabled=true);b.classList.add('right');showFix();}
    else{clean=false;b.classList.add('wrong');b.disabled=true;$('.ph',wrap).textContent='That step is fine. Look for one that is wrong or just asserted.';}});
  function showFix(){
    $('.ph',wrap).innerHTML=`<b style="color:var(--end)">Found it.</b> ${esc(it.problem)}`;
    const fx=$('.fx',wrap);fx.innerHTML=`<p style="font-size:.9rem;color:var(--muted);margin:20px 0 4px">Which sentence should replace it?</p><div class="choices"></div>`;
    const ch=$('.choices',fx);const order=shuffle(it.fixes.map((t,i)=>({t,i})));
    order.forEach(o=>{const b=document.createElement('button');b.className='opt';b.textContent=o.t;b.onclick=()=>{
      const ok=o.i===it.fix;$$('.opt',ch).forEach(x=>{x.disabled=true;x.classList.add('dim');});b.classList.remove('dim');b.classList.add(ok?'right':'wrong');
      if(!ok){const r=[...ch.children].find((x,k)=>order[k].i===it.fix);r.classList.remove('dim');r.classList.add('right');}
      const s=$(`.sent[data-i="${it.bad}"]`,wrap);s.classList.replace('right','fixed');$('.tx',s).textContent=it.fixes[it.fix];
      const good=ok&&clean;record(good);fb(fx,good,good?'Correct':ok?'Right fix, but you tapped a strong step first':'Not the best replacement',ok?'The chain now holds together. Read it again from the top.':'The green option explains the step accurately and keeps the chain heading to the end point.');nextBtn(wrap);};ch.append(b);});
  }
}
/* ---- mcq ---- */
function itemMcq(it,wrap){
  const order=shuffle(it.o.map((t,i)=>({t,i})));
  wrap.innerHTML=`<span class="src">${esc(it.src)}</span>${it.table||''}<div class="qbox">${esc(it.prompt)}</div><div class="choices"></div>`;
  const ch=$('.choices',wrap);
  order.forEach(o=>{const b=document.createElement('button');b.className='opt';b.textContent=o.t;b.dataset.i=o.i;b.onclick=()=>{const ok=o.i===it.a;
    $$('.opt',ch).forEach((x,k)=>{x.disabled=true;x.classList.add(order[k].i===it.a?'right':'dim');});if(!ok)b.classList.replace('dim','wrong');
    record(ok);fb(wrap,ok,ok?'Correct':'Not this one',esc(it.why));nextBtn(wrap);};ch.append(b);});
}
/* ---- calc ---- */
function itemCalc(it,wrap){
  if(it.gen)it=Object.assign({},it,it.gen());           /* fresh numbers on every attempt */
  const pre=it.pre===true?'£':(it.pre||''),suf=it.pre===true?'m':(it.unit||'');
  const ansText=()=>pre+Number(it.ans).toLocaleString('en-GB',{maximumFractionDigits:2})+(suf==='m'||suf==='%'?suf:suf?' '+suf:'');
  wrap.innerHTML=`<span class="src">${esc(it.src)}</span>${it.table||''}${it.given?`<div class="card" style="margin-bottom:16px">${it.given}</div>`:''}<div class="qbox">${esc(it.prompt)}</div>
   <div class="calcrow">${pre?`<span class="u">${esc(pre)}</span>`:''}<input class="txt num" inputmode="decimal" autocomplete="off" aria-label="Your answer"><span class="u">${esc(suf)}</span><button class="btn small">Check</button></div><div class="fbz"></div>`;
  const inp=$('.num',wrap),btn=$('.btn',wrap);inp.focus({preventScroll:true});
  const go=()=>{const v=parseFloat(inp.value.replace(/[−–]/g,'-').replace(/:\s*1\s*$/,'').replace(/[^0-9.\-]/g,''));if(isNaN(v)){inp.focus();return;}
    inp.disabled=true;btn.disabled=true;const ok=Math.abs(v-it.ans)<=(it.tol||0)+1e-9;
    const trap=!ok&&(it.traps||[]).find(t=>Math.abs(t.v-v)<=Math.max(0.06,Math.abs(t.v)*0.001));
    record(ok);fb($('.fbz',wrap),ok,ok?'Correct':`Not quite. The answer is ${esc(ansText())}`,(trap?esc(trap.m)+'<br><br>':'')+'<b>Working:</b> '+esc(it.work),it.use?esc(it.use):'');nextBtn(wrap);};
  btn.onclick=go;inp.onkeydown=e=>{if(e.key==='Enter')go();};
  wrap._timeout=()=>{inp.disabled=true;btn.disabled=true;fb($('.fbz',wrap),false,`Out of time. The answer is ${esc(ansText())}`,'<b>Working:</b> '+esc(it.work));};
}
/* ---- timed ---- */
function itemTimed(it,wrap){
  ({drift:itemDrift,mcq:itemMcq,calc:itemCalc}[it._k])(it,wrap);
  const secs=S.st.seconds||25;
  const bar=document.createElement('div');bar.className='cd';bar.innerHTML=`<i style="animation-duration:${secs}s"></i>`;wrap.prepend(bar);
  S.cd=setTimeout(()=>{S.cd=null;
    if(it._k==='calc'){record(false);wrap._timeout();nextBtn(wrap);return;}
    $$('.opt',wrap).forEach(x=>{x.disabled=true;const right=it._k==='drift'?((x.dataset.v==='1')===it.ok):(+x.dataset.i===it.a);x.classList.add(right?'right':'dim');});
    record(false);fb(wrap,false,'Out of time',esc(it.why));nextBtn(wrap);},secs*1000);
}
/* ---- write ---- */
function itemWrite(it,wrap){
  $('#pips').innerHTML='';
  const W=it.w,onSite=/github\.io$|workers\.dev$/.test(location.hostname);
  const plan=W.plan||[];
  wrap.innerHTML=`<span class="src">${esc(it.src)}</span>${W.intro}
   ${plan.length?`<div class="plan">${plan.map(p=>`<label class="${p.cls||''}">${esc(p.label)}<input class="txt" data-p="${p.id}" placeholder="${esc(p.ph||'')}"></label>`).join('')}</div>
   <p class="planmsg" style="font-size:.88rem;color:var(--muted);min-height:1.4em" aria-live="polite"></p>`:''}
   <textarea id="ans" placeholder="${esc(W.placeholder||'Write your answer here...')}" ${plan.length?'disabled':''} aria-label="Your answer"></textarea><div class="wc">0 words</div>
   <div class="checks">${W.checks.map(c=>`<div class="ck" data-k="${c.k}"><i></i><span>${esc(c.label)}</span></div>`).join('')}<div class="ck" data-k="warn" hidden><i></i><span class="dtx"></span></div></div>
   <div class="next"><button class="btn small" id="cmp" disabled>Compare with an example</button>${onSite&&W.ai?'<button class="btn small ghost" id="aiBtn" disabled>Get written feedback</button>':''}<button class="btn small ghost" id="doneW" disabled>${esc(W.finishLabel||'Finish the course')}</button></div>
   <div id="aiOut"></div><div id="mdl"></div>`;
  const ta=$('#ans'),msg=$('.planmsg',wrap);ta.value=state.draft||'';
  const inputs=$$('input[data-p]',wrap);
  inputs.forEach(i=>{i.value=state['plan'+i.dataset.p]||'';});
  function doPlan(){
    if(!plan.length)return;
    inputs.forEach(i=>{state['plan'+i.dataset.p]=i.value;});save();
    const bad=plan.find(p=>!p.ok(String(state['plan'+p.id]||'').toLowerCase()));
    if(!bad){msg.innerHTML=`<span style="color:var(--ok)">${esc(W.planOk||'Good. Keep these in front of you while you write.')}</span>`;ta.disabled=false;}
    else{ta.disabled=!state.draft;msg.textContent=plan.every(p=>!state['plan'+p.id])?'':bad.hint;}
  }
  inputs.forEach(i=>i.oninput=doPlan);doPlan();
  function check(){
    const v=ta.value,low=v.toLowerCase();state.draft=v;save();
    const words=(v.match(/\b[\w'-]+\b/g)||[]).length;$('.wc',wrap).textContent=words+' words';
    const sents=v.split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
    const ctx={v,low,words,sents,last:(sents[sents.length-1]||'').toLowerCase(),first:(sents[0]||'').toLowerCase(),firstTwo:sents.slice(0,2).join(' ').toLowerCase()};
    const r={};W.checks.forEach(c=>{r[c.k]=words>0&&!!c.test(ctx);$(`.ck[data-k="${c.k}"]`,wrap).classList.toggle('on',r[c.k]);});
    const wk=$('.ck[data-k="warn"]',wrap),w=words&&W.warn?W.warn(ctx):null;
    if(w){wk.hidden=false;wk.classList.add('warn');$('.dtx',wk).textContent=w.msg;}else wk.hidden=true;
    const all=Object.values(r).every(Boolean)&&!(w&&w.block);
    $('#cmp').disabled=words<(W.minCompare||60);$('#doneW').disabled=!all;if($('#aiBtn'))$('#aiBtn').disabled=words<(W.minAi||80);
  }
  ta.oninput=check;check();
  $('#cmp').onclick=()=>{const m=$('#mdl');if(m.innerHTML){m.innerHTML='';$('#cmp').textContent='Compare with an example';return;}
    $('#cmp').textContent='Hide the example';m.innerHTML=`<div class="card model" style="margin-top:20px">${W.model}</div>`;
    m.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});};
  $('#doneW').onclick=()=>{S.score=1;S.results=[true];clearInterval(timerId);finish(true);};
  const ai=$('#aiBtn');
  if(ai)ai.onclick=async()=>{
    ai.disabled=true;ai.textContent='Reading your answer...';const out=$('#aiOut');out.innerHTML='';
    try{
      const resp=await fetch('https://nishkam-marker.alevelnishkam.workers.dev',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:900,system:W.ai,messages:[{role:'user',content:'Student answer:\n\n'+ta.value}]})});
      if(!resp.ok)throw new Error('status '+resp.status);
      const data=await resp.json();const txt=(data.content||[]).map(c=>c.text||'').join('').trim();
      out.innerHTML=`<div class="card ai" style="margin-top:20px"><span class="src">Feedback</span>${esc(txt)}</div>`;
    }catch(e){out.innerHTML=`<div class="fb no"><b class="t">Feedback could not load</b>Check your connection and try again.</div>`;}
    ai.disabled=false;ai.textContent='Get written feedback';
  };
}

/* =====================================================================
   RESULT
   ===================================================================== */
function finish(writeDone){
  clearInterval(timerId);
  const st=S.st,n=st.items.length,passed=st.type==='write'?!!writeDone:S.score>=st.pass;
  const prevBest=state.best[st.id]??-1;if(S.score>prevBest)state.best[st.id]=S.score;
  if(passed)state.passed[st.id]=true;save();
  logResult({stage:OFFSET+st.id,stageTitle:(C.short?C.short+': ':'')+st.title,score:st.type==='write'?1:S.score,total:st.type==='write'?1:n,passed,
    seconds:Math.round((Date.now()-S.t0)/1000),
    missed:st.type==='write'?[]:st.items.filter((it,i)=>!S.results[i]).map(it=>it._id+' '+it.src),
    answer:st.type==='write'?(state.draft||''):''});
  const r=74,CIRC=2*Math.PI*r,frac=st.type==='write'?1:S.score/n;
  const missed=st.type==='write'?[]:st.items.map((it,i)=>S.results[i]?null:(it.src+(it.q?': '+it.q:it.prompt?': '+it.prompt:''))).filter(Boolean);
  const nextSt=STAGES.find(s=>s.id===st.id+1);
  let title,text;
  if(st.type==='write'){const W=st.items[0].w;title=W.doneTitle||'Course complete';text=W.doneText||'';}
  else if(passed&&!nextSt){title='Course complete';text=C.doneText||'You have passed every stage.';}
  else if(passed){title=S.score===n?'Full marks':'Stage passed';text=nextSt?`${esc(nextSt.title)} is now unlocked.`:'';}
  else{title='Not yet';text=`You need ${st.pass} out of ${n} to pass. Look at the ones you missed below, then try again. The order of the answers changes each time.`;}
  $('#stageBody').innerHTML=`<div class="item result"><div class="ringbox"><svg width="180" height="180" viewBox="0 0 180 180"><circle class="bgc" cx="90" cy="90" r="${r}" fill="none" stroke-width="10"/><circle class="fgc" id="resRing" cx="90" cy="90" r="${r}" fill="none" stroke-width="10" stroke-linecap="round" stroke="${passed?css('--ok'):css('--end')}" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"/></svg>
    <div class="val"><b>${st.type==='write'?'✓':S.score}</b><span>${st.type==='write'?'done':'out of '+n}</span></div></div>
    <h2>${title}</h2><p>${text}</p>
    <div class="next"><button class="btn" id="toMap">Back to the course map</button>${!passed&&st.type!=='write'?'<button class="btn ghost" id="again">Try again</button>':''}${passed&&nextSt?'<button class="btn ghost" id="goNext">Go to stage '+nextSt.id+'</button>':''}</div>
    ${missed.length?`<div class="card review"><span class="src">Have another look at</span><ul>${missed.map(m=>`<li>${esc(m)}</li>`).join('')}</ul></div>`:''}</div>`;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{$('#resRing').style.strokeDashoffset=CIRC*(1-frac);}));
  if(passed)burst();
  $('#toMap').onclick=toMap;
  if($('#again'))$('#again').onclick=()=>openStage(st.id);
  if($('#goNext'))$('#goNext').onclick=()=>openStage(nextSt.id);
  scrollTo(0,0);
}
function toMap(){clearInterval(timerId);S=null;$('#stageView').hidden=true;$('#mapView').hidden=false;running=true;draw();renderMap();scrollTo({top:$('.map').offsetTop-20});}
$('#backBtn').onclick=toMap;
$('#resetAll').onclick=e=>{const b=e.target;if(b.dataset.sure){state=blank();save();b.textContent='Reset my progress';delete b.dataset.sure;renderMap();}else{b.dataset.sure=1;b.textContent='Tap again to confirm. This clears every stage.';}};

/* particle burst on pass */
function burst(){
  if(reduce)return;const c=$('#burst'),x=c.getContext('2d'),d=Math.min(devicePixelRatio||1,2);c.width=innerWidth*d;c.height=innerHeight*d;x.setTransform(d,0,0,d,0,0);
  const ring=$('.ringbox').getBoundingClientRect(),ox=ring.left+ring.width/2,oy=ring.top+ring.height/2;
  const cols=[css('--start'),css('--chain'),css('--end'),css('--gold')];
  const ps=Array.from({length:70},()=>{const a=Math.random()*Math.PI*2,v=2+Math.random()*5;return{x:ox,y:oy,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1.5,l:1,c:cols[Math.random()*4|0],r:2+Math.random()*2.5};});
  (function f(){x.clearRect(0,0,innerWidth,innerHeight);let alive=false;for(const p of ps){p.x+=p.vx;p.y+=p.vy;p.vy+=.08;p.vx*=.985;p.l-=.012;if(p.l>0){alive=true;x.globalAlpha=p.l;x.fillStyle=p.c;x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill();}}x.globalAlpha=1;if(alive)requestAnimationFrame(f);else x.clearRect(0,0,innerWidth,innerHeight);})();
}

/* magnetic buttons */
if(fine&&!reduce)document.addEventListener('pointermove',e=>{const b=e.target.closest('.btn');$$('.btn').forEach(x=>{if(x!==b)x.style.transform='';});if(b&&!b.disabled){const r=b.getBoundingClientRect();b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.15}px,${(e.clientY-r.top-r.height/2)*.22}px)`;}});

if(TRACK)$('#resetAll').hidden=true;
document.title=document.title||C.name;
renderAuth();renderMap();if(auth){syncProgress();flush();}
})();
