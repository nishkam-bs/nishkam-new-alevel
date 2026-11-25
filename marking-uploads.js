/* =====================================================================
   Shared helper for the essay markers (photo/PDF uploads + talking to
   the marking proxy). Same file on the 7132 and 7138 sites.

   What it fixes:
   - every photo is shrunk to a JPEG before sending (big phone photos
     and PNG screenshots were being rejected by the API)
   - photos that can't be opened (e.g. HEIC on Windows) or PDFs that are
     too big get a clear message instead of silently doing nothing
   - scanned PDFs are accepted
   - "Mark" waits until photos have finished loading
   - if the student is on the photo tab, the photos are marked, not old
     typed text left in the hidden box
   - one automatic retry if the connection drops or the marker is busy,
     and plain-English error messages
   No student data is stored in this file.
   ===================================================================== */
(function(){
"use strict";
const PROXY='https://nishkam-marker.alevelnishkam.workers.dev';
const MAX_DIM=1600, QUALITY=0.72, MAX_PDF=6*1024*1024, MAX_BODY=8500000;
let pending=0, waiters=[];

function done(){pending--; if(pending<=0){pending=0; waiters.splice(0).forEach(f=>f());}}
function ready(){return pending?new Promise(r=>waiters.push(r)):Promise.resolve();}

function readAsDataURL(file){
  return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('read'));r.readAsDataURL(file);});
}
function toJpeg(src){
  return new Promise((res,rej)=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
      if(!w||!h){rej(new Error('decode'));return;}
      if(w>MAX_DIM||h>MAX_DIM){if(w>h){h=Math.round(h*MAX_DIM/w);w=MAX_DIM;}else{w=Math.round(w*MAX_DIM/h);h=MAX_DIM;}}
      const c=document.createElement('canvas');c.width=w;c.height=h;
      const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
      res(c.toDataURL('image/jpeg',QUALITY));
    };
    img.onerror=()=>rej(new Error('decode'));
    img.src=src;
  });
}
function isPdf(f){return f.type==='application/pdf'||/\.pdf$/i.test(f.name||'');}
function isImage(f){return (f.type||'').startsWith('image/')||/\.(jpe?g|png|heic|heif|webp|gif)$/i.test(f.name||'');}

/* one file -> data URL (JPEG for photos, PDF kept as it is) */
async function prepare(file){
  if(isPdf(file)){
    if(file.size>MAX_PDF)throw new Error('That PDF is too big to send. Take photos of the pages instead, or scan fewer pages.');
    const u=await readAsDataURL(file);
    return 'data:application/pdf;base64,'+u.split(',')[1];
  }
  if(!isImage(file))throw new Error('That file type can\'t be marked. Upload photos (JPG or PNG) or a PDF.');
  const src=await readAsDataURL(file);
  try{return await toJpeg(src);}
  catch(e){throw new Error('One of your photos couldn\'t be opened. If it\'s an iPhone HEIC photo, take a screenshot of it and upload that instead, or set the camera to "Most Compatible".');}
}

function statusEl(previews){
  if(!previews)return null;
  let s=previews.parentElement&&previews.parentElement.querySelector('.nm-status');
  if(!s){s=document.createElement('p');s.className='nm-status';s.style.cssText='font-size:13px;margin:8px 0 0;line-height:1.5';previews.insertAdjacentElement('afterend',s);}
  return s;
}
function summary(list){
  const pdf=list.filter(u=>u.startsWith('data:application/pdf')).length,ph=list.length-pdf;
  const parts=[];if(ph)parts.push(ph+' photo'+(ph>1?'s':''));if(pdf)parts.push(pdf+' PDF'+(pdf>1?'s':''));
  return parts.length?parts.join(' and ')+' ready.':'';
}
function say(previews,msg,bad){const s=statusEl(previews);if(!s)return;s.textContent=msg||'';s.style.color=bad?'var(--red,#be4848)':'';}

function thumb(previews,url,list){
  if(!previews)return;
  const wrap=document.createElement('span');
  wrap.style.cssText='position:relative;display:inline-block';
  let el;
  if(url.startsWith('data:application/pdf')){
    el=document.createElement('span');el.textContent='PDF';
    el.style.cssText='display:inline-flex;align-items:center;justify-content:center;width:70px;height:90px;border:1px solid var(--line,#ccc);border-radius:8px;font-weight:700;font-size:13px';
  }else{el=document.createElement('img');el.src=url;}
  const x=document.createElement('button');x.type='button';x.textContent='×';x.title='Remove';
  x.style.cssText='position:absolute;top:2px;right:2px;width:22px;height:22px;border-radius:50%;border:0;background:rgba(0,0,0,.6);color:#fff;font-size:15px;line-height:20px;cursor:pointer;padding:0';
  x.onclick=e=>{e.stopPropagation();const i=list.indexOf(url);if(i>=0)list.splice(i,1);wrap.remove();say(previews,summary(list));};
  wrap.appendChild(el);wrap.appendChild(x);previews.appendChild(wrap);
}

/* add files to the page's list (array of data URLs), with previews */
function addFiles(files,list,previews,max){
  max=max||6;
  const arr=[...(files||[])];
  if(!arr.length)return Promise.resolve();
  say(previews,'Getting your pages ready…');
  const jobs=[];let msg='';
  for(const f of arr){
    if(list.length+jobs.length>=max){msg='You can upload up to '+max+' pages. Extra pages were left out.';break;}
    pending++;
    jobs.push(prepare(f).then(u=>{list.push(u);thumb(previews,u,list);}).catch(e=>{msg=e.message;}).finally(done));
  }
  return Promise.all(jobs).then(()=>{
    if(msg)say(previews,msg,true);
    else say(previews,list.length?summary(list)+' Check they are the right way up and easy to read.':'');
  });
}

/* image/PDF content blocks for the API */
function blocks(list){
  return list.map(u=>{
    const data=u.split(',')[1];
    if(u.startsWith('data:application/pdf'))return {type:'document',source:{type:'base64',media_type:'application/pdf',data}};
    return {type:'image',source:{type:'base64',media_type:'image/jpeg',data}};
  });
}

/* mark the photos if the student is on the photo tab (or hasn't typed anything) */
function usePhotos(list,typed){
  if(!list||!list.length)return false;
  const up=document.getElementById('uploadMode')||document.getElementById('uploadMode2');
  const upOn=up&&getComputedStyle(up).display!=='none';
  return upOn||!String(typed||'').trim();
}

const UNREADABLE_NOTE='\n\nHANDWRITING. Read the handwriting carefully before you mark. Do not guess at words to make the answer work. If you cannot read it confidently (more than about one word in twenty is a guess, or a sentence that matters for the mark is unclear), do not mark it: reply only with {"unreadable":true,"reason":"<which parts you could not read, for example most of the second paragraph, in one short sentence>"}. If you can read it but some words or parts were hard to read, mark it and add "legibility":"<one sentence telling the student which words or parts were hard to read>" to your JSON. Leave legibility out if the handwriting was clear.';

function friendly(status,text){
  if(status===413)return 'Your pages are too big to send. Try fewer pages, or type your answer.';
  if(status===400&&/image|document|pdf|media/i.test(text||''))return 'The marker couldn\'t open one of your pages. Try a normal photo instead of a screenshot or scan, or type your answer.';
  if(status===429||status===529||status>=500)return 'The marker is busy right now. Wait a minute and press the button again. Your answer is still here.';
  if(status===403)return 'This page couldn\'t reach the marker. Open it from the school website rather than a saved copy.';
  return 'Something went wrong with the marker (error '+status+'). Press the button again. If it keeps happening, tell your teacher.';
}

/* send to the proxy: one retry for dropped connections / busy marker */
async function ask(payload,opts){
  opts=opts||{};
  const body=JSON.stringify(payload);
  if(body.length>MAX_BODY)throw new Error('Your pages are too big to send together. Try fewer pages, or type your answer.');
  let lastErr;
  for(let attempt=0;attempt<2;attempt++){
    const ctl=typeof AbortController!=='undefined'?new AbortController():null;
    const timer=ctl?setTimeout(()=>ctl.abort(),opts.timeout||150000):null;
    try{
      const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body,signal:ctl&&ctl.signal});
      clearTimeout(timer);
      const t=await r.text();
      if(!r.ok){
        lastErr=new Error(friendly(r.status,t));
        if(r.status===429||r.status===529||r.status>=500){await new Promise(z=>setTimeout(z,2500));continue;}
        throw lastErr;
      }
      let d;try{d=JSON.parse(t);}catch(e){lastErr=new Error('The marker sent back something unexpected. Press the button again.');continue;}
      if(!d||!Array.isArray(d.content)){lastErr=new Error('The marker sent back an empty reply. Press the button again.');continue;}
      return d;
    }catch(e){
      clearTimeout(timer);
      if(e&&e.name==='AbortError')lastErr=new Error('Marking took too long. Press the button again. On a phone, keep this page open while it marks.');
      else if(e instanceof TypeError)lastErr=new Error('Couldn\'t reach the marker. Check your internet and press the button again. On a phone, keep this page open while it marks.');
      else throw e;
      if(attempt===0){await new Promise(z=>setTimeout(z,2000));continue;}
    }
  }
  throw lastErr;
}
function text(d){return (d&&d.content||[]).map(c=>c.text||'').join('');}

/* pull the JSON object out of the reply */
function json(t){
  const c=String(t||'').replace(/```json|```/g,'').trim();
  const a=c.indexOf('{'),b=c.lastIndexOf('}');
  if(a<0||b<=a)throw new Error('nojson');
  const o=JSON.parse(c.slice(a,b+1));
  if(o&&o.unreadable){
    const why=o.reason?String(o.reason).replace(/\.$/,''):'';
    try{window.dispatchEvent(new CustomEvent('nm-unreadable',{detail:{reason:why}}));}catch(x){}
    const e=new Error('Your answer has not been marked because the marker could not read your handwriting clearly enough to mark it fairly'+(why?' ('+why+')':'')+'. If your photos are blurred or dark, retake them in good light, straight on, one page per photo. If the photos are clear, the problem is the handwriting itself: in the exam an examiner has to read it too, so write more slowly and clearly, or type your answer here. Your teacher can see that this answer could not be read.');e.unreadable=true;throw e;}
  window.__nmLegibility=o&&o.legibility?{t:Date.now(),text:String(o.legibility).slice(0,400)}:null;
  return o;
}
/* ask + json, trying once more if the reply wasn't readable JSON */
async function markJSON(payload,opts){
  for(let i=0;i<2;i++){
    const d=await ask(payload,opts);
    try{const o=json(text(d));o._stop=d.stop_reason;return o;}
    catch(e){if(e.unreadable)throw e;if(i===1)throw new Error('The marker\'s reply came back incomplete. Press the button again.');}
  }
}

window.NMark={PROXY,addFiles,ready,blocks,usePhotos,ask,text,json,markJSON,UNREADABLE_NOTE,get pending(){return pending;}};
})();
