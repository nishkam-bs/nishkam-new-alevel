/* =====================================================================
   Year 12 (7138) tracker: sends marking-tool results to the teacher's sheet.
   Students sign in once with their exam number and the class code.
   Sign-in is shared with the 7138 courses (stored as y12_auth).
   Results go to the Year 12 tracker Worker, never straight to a sheet.
   ===================================================================== */
(function(){
"use strict";
const API='https://nishkam-tracker-7138.alevelnishkam.workers.dev';
const ON=/github\.io$/.test(location.hostname)||/[?&]track=test/.test(location.search);
const AKEY='y12_auth',QKEY='y12_pending';
let auth=null,waiting=null,mountEl=null;
try{auth=JSON.parse(localStorage.getItem(AKEY)||'null');}catch(e){}

const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pending=()=>{try{return JSON.parse(localStorage.getItem(QKEY)||'[]');}catch(e){return [];}};
const setPending=q=>{try{localStorage.setItem(QKEY,JSON.stringify(q.slice(-20)));}catch(e){}};

async function api(path,body){
  const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(d.error||'Something went wrong');e.status=r.status;throw e;}
  return d;
}

const css=`.ytk{border:1px solid rgba(127,127,127,.28);border-radius:12px;padding:12px 14px;margin:0 0 16px;font-size:14px;line-height:1.5;background:rgba(127,127,127,.06)}
.ytk.alert{border-color:#b7791f;background:rgba(183,121,31,.12)}
.ytk form{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}
.ytk input{flex:1 1 140px;min-width:0;padding:8px 10px;border-radius:8px;border:1px solid rgba(127,127,127,.4);font:inherit;background:#fff;color:#17202e}
.ytk button{padding:8px 16px;border-radius:999px;border:0;cursor:pointer;font:600 13px/1.2 inherit;font-family:inherit;background:#17202e;color:#fff}
.ytk button.link{background:none;color:inherit;text-decoration:underline;padding:0 0 0 6px;font-weight:400}
.ytk .err{color:#c8463c;font-size:13px;margin-top:6px}
.ytk .ok{color:#2f8a4a}`;

function signOut(){auth=null;try{localStorage.removeItem(AKEY);}catch(e){}}

function render(msg,cls,into){
  if(!ON||!mountEl)return;
  let box=document.getElementById('ytkBox');
  if(!box){box=document.createElement('div');box.id='ytkBox';box.setAttribute('aria-live','polite');mountEl.parentNode.insertBefore(box,mountEl);}
  if(into&&box.parentNode!==into)into.prepend(box);
  box.className='ytk'+(cls?' '+cls:'');
  if(auth){
    box.innerHTML=`Signed in as <b>${esc(auth.name)}</b>. Your marks are saved for your teacher.${msg?` <span class="ok">${esc(msg)}</span>`:''}<button class="link" type="button" id="ytkOut">Not you?</button>`;
    document.getElementById('ytkOut').onclick=()=>{signOut();render();};
    return;
  }
  box.innerHTML=`${msg?`<b>${esc(msg)}</b><br>`:''}Sign in with your exam number and the class code so your marks are saved for your teacher. You only need to do this once on each device.
    <form id="ytkForm"><input id="ytkExam" inputmode="numeric" autocomplete="off" placeholder="Exam number" aria-label="Exam number"><input id="ytkCode" autocomplete="off" placeholder="Class code" aria-label="Class code"><button type="submit">Sign in</button></form><div class="err" id="ytkErr"></div>`;
  document.getElementById('ytkForm').onsubmit=async e=>{e.preventDefault();
    const btn=e.target.querySelector('button'),err=document.getElementById('ytkErr');btn.disabled=true;err.textContent='';
    try{const d=await api('/login',{exam:document.getElementById('ytkExam').value.trim(),code:document.getElementById('ytkCode').value.trim()});
      auth={token:d.token,name:d.name,exam:d.exam};try{localStorage.setItem(AKEY,JSON.stringify(auth));}catch(x){}
      if(waiting){const q=pending();q.push(waiting);setPending(q);waiting=null;}
      render();flush();
    }catch(x){err.textContent=x.message==='Failed to fetch'?'Could not connect. Check your internet and try again.':x.message;btn.disabled=false;}};
}

async function flush(){
  if(!ON||!auth)return;
  const q=pending();if(!q.length)return;
  const left=[];let saved=0;
  for(const row of q){
    try{await api('/mark',Object.assign({},row,{token:auth.token}));saved++;}
    catch(x){
      if(x.status===401){signOut();left.push(row);render('Please sign in again to save your mark.','alert');}
      else if(x.status===400){/* bad data: drop it */}
      else left.push(row);
    }
  }
  setPending(left);
  if(saved&&auth)render('Mark saved.');
  else if(left.length&&auth)render(`${left.length} mark${left.length>1?'s':''} waiting to send. It will try again next time.`,'alert');
}

window.YTrack={
  init(sel){if(!ON)return;const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
    mountEl=typeof sel==='string'?document.querySelector(sel):sel;render();flush();},
  /* r: {tool, question, mark, maxMark, level, www1, www2, ebi1, ebi2, answer, panel} */
  mark(r){
    if(!ON)return;
    const s=(v,n)=>String(v==null?'':v).slice(0,n);
    const row={tool:s(r.tool,40),question:s(r.question,500),mark:s(r.mark,10),maxMark:s(r.maxMark,10),level:s(r.level,60),
      www1:s(r.www1,1500),www2:s(r.www2,1500),ebi1:s(r.ebi1,1500),ebi2:s(r.ebi2,1500),answer:s(r.answer,12000)};
    const into=r.panel?document.querySelector(r.panel):null;
    if(!auth){waiting=row;render('Your mark has not been saved yet.','alert',into);return;}
    if(into)render('','',into);
    const q=pending();q.push(row);setPending(q);flush();
  }
};
})();
