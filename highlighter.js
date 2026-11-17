/* =====================================================================
   Highlighter for case studies (7138 site).
   Students select text in a case study and pick a colour, like using
   highlighter pens on paper. Highlights are saved to the student's
   account (account.js), so they follow them between devices, and the
   same case study shows the same highlights in every tool.

   Works on any element matching SEL below. New ones added by a page
   later (the labs redraw their pages) are picked up automatically.
   Saved as character positions in the case study text, keyed by a hash
   of that text. No student data is written in this file.
   ===================================================================== */
(function(){
"use strict";
const SEL='.cs-body,.casetext,[data-hl]';
const COLOURS=[['y','Yellow','#ffe766'],['b','Blue','#a9d4ff'],['g','Green','#b4eab2'],['p','Pink','#ffbfd9']];
const A=window.Acct||null, KEY='highlights', LKEY='n8_hl';

/* ---------- storage ---------- */
function all(){
  let d=null;
  if(A&&A.user)d=A.get(KEY);
  if(!d){try{d=JSON.parse(localStorage.getItem(LKEY)||'null');}catch(e){}}
  return d&&typeof d==='object'?d:{};
}
function save(d){
  /* keep the 150 most recently used case studies */
  const ks=Object.keys(d);if(ks.length>150)ks.sort((a,b)=>(d[a].t||0)-(d[b].t||0)).slice(0,ks.length-150).forEach(k=>delete d[k]);
  if(A&&A.user)A.set(KEY,d);
  try{localStorage.setItem(LKEY,JSON.stringify(d));}catch(e){}
}
if(A)A.merge(KEY,(a,b)=>{const o=Object.assign({},b||{});Object.entries(a||{}).forEach(([k,v])=>{if(!o[k]||(v.t||0)>=(o[k].t||0))o[k]=v;});return o;});

function hash(s){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return 'h'+(h>>>0).toString(36)+'_'+s.length;}

/* ---------- text positions ---------- */
function texts(el){const out=[],w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode()))out.push(n);return out;}
function plain(el){return texts(el).map(n=>n.nodeValue).join('');}
function offsetOf(el,node,off){
  if(node.nodeType!==3){ /* selection ended on an element: count the text before that child */
    let pos=0;const kids=[...node.childNodes].slice(0,off);
    for(const t of texts(el)){if(kids.some(k=>k===t||k.contains(t)))pos+=t.nodeValue.length;else if(node.compareDocumentPosition(t)&Node.DOCUMENT_POSITION_PRECEDING)pos+=t.nodeValue.length;}
    return pos;
  }
  let pos=0;for(const t of texts(el)){if(t===node)return pos+off;pos+=t.nodeValue.length;}
  return pos;
}
function unwrap(el){el.querySelectorAll('mark.nk-hl').forEach(m=>{m.replaceWith(...m.childNodes);});el.normalize();}
function paint(el,ranges){
  unwrap(el);
  ranges.slice().sort((a,b)=>b.s-a.s).forEach(r=>{
    let pos=0;const parts=[];
    for(const t of texts(el)){const len=t.nodeValue.length,a=Math.max(r.s,pos),b=Math.min(r.e,pos+len);
      if(b>a)parts.push([t,a-pos,b-pos]);pos+=len;}
    parts.reverse().forEach(([t,a,b])=>{
      if(!t.nodeValue.slice(a,b).trim())return;
      const mid=t.splitText(a);mid.splitText(b-a);
      const m=document.createElement('mark');m.className='nk-hl nk-'+r.c;m.dataset.s=r.s;
      mid.replaceWith(m);m.appendChild(mid);
    });
  });
}

/* ---------- each case study ---------- */
const boxes=new Map(); /* element -> {key} */
function ranges(key){const d=all()[key];return d&&Array.isArray(d.r)?d.r:[];}
function setRanges(key,r){const d=all();if(r.length)d[key]={r,t:Date.now()};else delete d[key];save(d);}
function refresh(el){
  const b=boxes.get(el);if(!b)return;
  paint(el,ranges(b.key));
  const n=ranges(b.key).length;
  if(b.bar){b.bar.querySelector('.nk-hl-clear').hidden=!n;}
}
function attach(el){
  if(boxes.has(el))return;
  const txt=plain(el);if(txt.trim().length<40)return;
  const key=hash(txt.replace(/\s+/g,' ').trim());
  const bar=document.createElement('div');bar.className='nk-hl-bar';
  bar.innerHTML='<span>Select any text to highlight it.</span><button type="button" class="nk-hl-clear" hidden>Clear my highlights</button>';
  bar.querySelector('button').onclick=()=>{if(confirm('Remove all your highlights from this case study?')){setRanges(key,[]);document.querySelectorAll(SEL).forEach(x=>{const o=boxes.get(x);if(o&&o.key===key)refresh(x);});}};
  el.parentNode.insertBefore(bar,el);
  boxes.set(el,{key,bar});
  refresh(el);
}
function scan(){
  document.querySelectorAll(SEL).forEach(attach);
  for(const el of [...boxes.keys()])if(!el.isConnected){const b=boxes.get(el);if(b.bar)b.bar.remove();boxes.delete(el);}
}

/* ---------- the colour menu ---------- */
let menu=null,target=null;
function buildMenu(){
  menu=document.createElement('div');menu.className='nk-hl-menu';menu.hidden=true;menu.setAttribute('role','toolbar');menu.setAttribute('aria-label','Highlight');
  menu.innerHTML=COLOURS.map(([c,n])=>`<button type="button" data-c="${c}" class="nk-${c}" title="${n}" aria-label="Highlight ${n.toLowerCase()}"></button>`).join('')+'<button type="button" data-c="x" class="nk-x" title="Remove highlight">Remove</button>';
  menu.addEventListener('mousedown',e=>e.preventDefault());
  menu.addEventListener('click',e=>{const c=e.target.closest('button');if(c)apply(c.dataset.c);});
  document.body.appendChild(menu);
}
function hide(){if(menu)menu.hidden=true;target=null;}
function show(rect,info){
  if(!menu)buildMenu();
  target=info;menu.hidden=false;
  menu.querySelector('.nk-x').hidden=!info.overlap;
  const mw=menu.offsetWidth||200,mh=menu.offsetHeight||40;
  let x=rect.left+rect.width/2-mw/2,y=rect.bottom+10;
  if(y+mh>innerHeight-8)y=rect.top-mh-10;
  x=Math.max(8,Math.min(x,innerWidth-mw-8));y=Math.max(8,y);
  menu.style.left=x+'px';menu.style.top=y+'px';
}
function boxOf(node){for(const el of boxes.keys())if(el.contains(node))return el;return null;}
function check(){
  const sel=getSelection();
  if(!sel||!sel.rangeCount||sel.isCollapsed){return;}
  const r=sel.getRangeAt(0),el=boxOf(r.commonAncestorContainer);
  if(!el){hide();return;}
  let s=offsetOf(el,r.startContainer,r.startOffset),e=offsetOf(el,r.endContainer,r.endOffset);
  if(e<s)[s,e]=[e,s];
  const t=plain(el).slice(s,e);
  /* trim spaces at the ends */
  s+=t.length-t.trimStart().length;e-=t.length-t.trimEnd().length;
  if(e<=s){hide();return;}
  const key=boxes.get(el).key,overlap=ranges(key).some(x=>x.s<e&&x.e>s);
  show(r.getBoundingClientRect(),{el,key,s,e,overlap});
}
function apply(c){
  if(!target)return;const {key,s,e}=target;
  let r=[];
  ranges(key).forEach(x=>{ /* cut out the part being re-coloured or removed */
    if(x.e<=s||x.s>=e){r.push(x);return;}
    if(x.s<s)r.push({s:x.s,e:s,c:x.c});
    if(x.e>e)r.push({s:e,e:x.e,c:x.c});
  });
  if(c!=='x')r.push({s,e,c});
  r=r.filter(x=>x.e>x.s).sort((a,b)=>a.s-b.s);
  /* join touching highlights of the same colour */
  const out=[];r.forEach(x=>{const l=out[out.length-1];if(l&&l.c===x.c&&l.e>=x.s)l.e=Math.max(l.e,x.e);else out.push(Object.assign({},x));});
  setRanges(key,out);
  try{getSelection().removeAllRanges();}catch(e){}
  hide();
  document.querySelectorAll(SEL).forEach(x=>{const o=boxes.get(x);if(o&&o.key===key)refresh(x);});
}
/* tap or click a highlight to change or remove it */
document.addEventListener('click',e=>{
  const m=e.target.closest&&e.target.closest('mark.nk-hl');
  if(!m){if(menu&&!menu.contains(e.target)&&getSelection().isCollapsed)hide();return;}
  const el=boxOf(m);if(!el)return;
  const key=boxes.get(el).key,s0=+m.dataset.s,hit=ranges(key).find(x=>x.s===s0);
  if(!hit)return;
  e.stopPropagation();e.preventDefault();
  show(m.getBoundingClientRect(),{el,key,s:hit.s,e:hit.e,overlap:true});
},true);
document.addEventListener('mouseup',()=>setTimeout(check,0));
document.addEventListener('keyup',e=>{if(e.shiftKey||e.key==='Shift')check();});
let selT=null;
document.addEventListener('selectionchange',()=>{clearTimeout(selT);selT=setTimeout(()=>{const s=getSelection();if(s&&!s.isCollapsed)check();},450);});
addEventListener('scroll',()=>{if(menu&&!menu.hidden&&target&&!target.overlap)check();},{passive:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});

/* ---------- styles ---------- */
const css=document.createElement('style');
css.textContent=`mark.nk-hl{color:inherit;border-radius:2px;padding:0 1px;cursor:pointer;-webkit-box-decoration-break:clone;box-decoration-break:clone}
${COLOURS.map(([c,,h])=>`mark.nk-${c},.nk-hl-menu .nk-${c}{background:${h}}`).join('\n')}
@media (prefers-color-scheme:dark){mark.nk-hl{color:#111}}
.nk-hl-bar{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:12.5px;opacity:.75;margin:4px 0 6px}
.nk-hl-bar button{font:inherit;background:none;border:0;padding:0;text-decoration:underline;cursor:pointer;color:inherit}
.nk-hl-menu{position:fixed;z-index:10000;display:flex;gap:6px;align-items:center;padding:6px;border-radius:12px;background:#1b2a4a;box-shadow:0 6px 20px rgba(0,0,0,.25)}
.nk-hl-menu button{width:30px;height:30px;border-radius:50%;border:2px solid rgba(255,255,255,.85);cursor:pointer;padding:0}
.nk-hl-menu .nk-x{width:auto;border-radius:8px;padding:0 10px;background:transparent;color:#fff;font:600 12.5px system-ui,sans-serif}
.nk-hl-menu[hidden]{display:none}
@media print{.nk-hl-bar,.nk-hl-menu{display:none!important}mark.nk-hl{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
document.head.appendChild(css);

/* ---------- start ---------- */
function start(){
  scan();
  new MutationObserver(()=>{clearTimeout(start.t);start.t=setTimeout(scan,60);}).observe(document.body,{childList:true,subtree:true});
  if(A){A.ready.then(()=>boxes.forEach((b,el)=>refresh(el)));A.onChange(k=>{if(k.includes(KEY)||k.includes('*'))boxes.forEach((b,el)=>refresh(el));});}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.NHighlight={scan};
})();
