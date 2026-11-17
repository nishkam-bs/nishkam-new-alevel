/* =====================================================================
   Shared layout for the results screen on every essay marker
   (7132 and 7138 sites). Each marker passes in its own feedback and
   gets back the same layout:

     1. Mark, level and a short summary
     2. What went well  |  Focus on this next
     3. What it could look like (you wrote / it could read)
     4. Your answer with notes (markers that annotate)
     5. More detail (closed until opened)

   No student data is stored in this file.
   ===================================================================== */
(function(){
"use strict";

const CSS=`
.nfb{--nfb-good:#288566;--nfb-mid:#3a69b4;--nfb-amber:#b7791f;--nfb-bad:#be4848;--nfb-line:var(--line,#dfe4ea);--nfb-ink:var(--ink,#191f2a);--nfb-muted:var(--muted,#6a7485);--nfb-navy:var(--navy,#0d1b34);
  color:var(--nfb-ink);font-size:15px;line-height:1.65;display:flex;flex-direction:column;gap:18px;min-width:0}
.nfb *{box-sizing:border-box}
.nfb-card{background:#fff;border:1px solid var(--nfb-line);border-radius:16px;padding:24px 26px;min-width:0;box-shadow:0 1px 2px rgba(13,27,52,.04)}
.nfb h3{font-size:17px;font-weight:800;color:var(--nfb-navy);margin:0 0 12px;letter-spacing:-.01em}
.nfb p{margin:0}

/* 1. header */
.nfb-top{display:grid;grid-template-columns:minmax(200px,240px) minmax(0,1fr);border-radius:18px;overflow:hidden;border:1px solid var(--nfb-line);background:#fff;box-shadow:0 6px 24px rgba(13,27,52,.07)}
.nfb-score{background:linear-gradient(160deg,#0d1b34 0%,#1b2f55 100%);color:#fff;padding:28px 26px;display:flex;flex-direction:column;justify-content:center;gap:10px}
.nfb-score .k{font-size:12px;font-weight:600;opacity:.7}
.nfb-mark{font-size:58px;font-weight:900;line-height:1;letter-spacing:-.03em}
.nfb-mark span{font-size:30px;opacity:.55;font-weight:700;margin-left:2px}
.nfb-lvl{align-self:flex-start;font-size:13px;font-weight:700;padding:5px 12px;border-radius:999px;background:var(--tone);color:#fff}
.nfb-sum{padding:24px 28px;display:flex;flex-direction:column;gap:14px;justify-content:center;min-width:0}
.nfb-q{font-size:13px;color:var(--nfb-muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.nfb-verdict{font-size:17px;line-height:1.55;font-weight:500}
.nfb-bands{display:flex;gap:4px}
.nfb-band{flex:var(--w) 1 0;min-width:0}
.nfb-band i{display:block;height:9px;border-radius:5px;background:#e9edf2;position:relative;overflow:hidden}
.nfb-band i b{position:absolute;inset:0 auto 0 0;width:var(--f);background:var(--tone);border-radius:5px}
.nfb-band small{display:block;font-size:11px;color:var(--nfb-muted);margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nfb-band.on small{color:var(--nfb-ink);font-weight:700}
.nfb-facts{display:flex;flex-wrap:wrap;gap:8px}
.nfb-fact{display:inline-flex;align-items:center;gap:7px;font-size:13px;padding:5px 11px 5px 9px;border-radius:999px;background:#f3f5f8;border:1px solid #e6eaf0}
.nfb-fact::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--dot,#9aa4b2)}
.nfb-fact b{font-weight:700}
.nfb-help{align-self:flex-start;background:none;border:0;padding:0;font:inherit;font-size:13px;color:var(--nfb-mid);text-decoration:underline;cursor:pointer}

/* 2. went well / focus */
.nfb-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}
.nfb-well{border-left:5px solid var(--nfb-good)}
.nfb-well h3{color:var(--nfb-good)}
.nfb-well ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.nfb-well li{position:relative;padding-left:26px}
.nfb-well li::before{content:"";position:absolute;left:0;top:5px;width:16px;height:16px;border-radius:50%;background:var(--nfb-good) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4.5 8.2l2.3 2.3 4.7-4.9' fill='none' stroke='%23fff' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/16px no-repeat}
.nfb-fix{border-left:5px solid #e0a526;background:#fffcf3}
.nfb-fix h3{color:#9a6510}
.nfb-fix .t{font-weight:700;margin-bottom:6px}
.nfb-how{margin-top:14px;padding-top:12px;border-top:1px dashed #ecdcb3}
.nfb-how .l{font-size:13px;font-weight:700;color:#9a6510;margin-bottom:3px}

/* 3. rewrite */
.nfb-rw{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start}
.nfb-rw>div{border-radius:12px;padding:16px 18px}
.nfb-rw .a{background:#f4f5f7;color:#3b4250}
.nfb-rw .b{background:#eef7f2;border:1px solid #cfe7da}
.nfb-rw .l{font-size:12px;font-weight:800;letter-spacing:.02em;margin-bottom:6px;color:var(--nfb-muted)}
.nfb-rw .b .l{color:var(--nfb-good)}
.nfb .nfb-why{margin-top:14px;font-size:14px;color:var(--nfb-muted)}
.nfb-wait{display:flex;align-items:center;gap:12px;color:var(--nfb-muted);font-size:14px}
.nfb-wait::before{content:"";width:18px;height:18px;border-radius:50%;border:3px solid #dfe4ea;border-top-color:var(--nfb-navy);animation:nfbspin .8s linear infinite;flex:none}
@keyframes nfbspin{to{transform:rotate(360deg)}}

/* 5. more detail */
.nfb-more{border:1px solid var(--nfb-line);border-radius:16px;background:#fff}
.nfb-more>summary{list-style:none;cursor:pointer;padding:18px 26px;font-weight:800;color:var(--nfb-navy);display:flex;justify-content:space-between;align-items:center}
.nfb-more>summary::-webkit-details-marker{display:none}
.nfb-more>summary::after{content:"";width:9px;height:9px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);margin-top:-4px;transition:transform .2s}
.nfb-more[open]>summary::after{transform:rotate(225deg);margin-top:4px}
.nfb-more>summary small{font-weight:500;color:var(--nfb-muted);margin-left:8px}
.nfb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;padding:0 26px 24px}
.nfb-item{background:#f7f8fa;border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.6;min-width:0}
.nfb-item .h{font-weight:800;color:var(--nfb-navy);margin-bottom:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.nfb-tag{font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--dot,#9aa4b2);color:#fff}
.nfb-item ul{margin:4px 0 0 18px;padding:0}
.nfb-wide{grid-column:1/-1}

.nfb-changes{display:flex;flex-direction:column}
.nfb-change{display:grid;grid-template-columns:120px minmax(0,1fr);gap:14px;padding:14px 0;border-top:1px solid #edf0f4;align-items:start}
.nfb-change:first-child{border-top:0;padding-top:2px}
.nfb-change .nfb-tag{justify-self:start;margin-top:2px}
.nfb-change p{color:#3b4250;font-size:14.5px;margin-top:2px}
@media (max-width:760px){.nfb-change{grid-template-columns:1fr;gap:6px}}

/* actions */
.nfb-act{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;padding-top:4px}

@media (max-width:760px){
  .nfb-top{grid-template-columns:1fr}
  .nfb-score{flex-direction:row;align-items:center;justify-content:space-between;padding:20px 22px;flex-wrap:wrap}
  .nfb-mark{font-size:46px}.nfb-mark span{font-size:24px}
  .nfb-score .k{display:none}
  .nfb-band .nm{display:none}
  .nfb-verdict{font-size:16px}
  .nfb-sum{padding:20px 22px}
  .nfb-two,.nfb-rw{grid-template-columns:1fr}
  .nfb-card{padding:20px}
  .nfb-grid{padding:0 18px 20px;grid-template-columns:1fr}
  .nfb-more>summary{padding:16px 20px}
  .nfb-act .btn{flex:1 1 100%}
}
@media print{.nfb-more:not([open]) .nfb-grid{display:grid}.nfb-act{display:none}}
`;
function injectCSS(){if(document.getElementById('nfb-css'))return;const s=document.createElement('style');s.id='nfb-css';s.textContent=CSS;document.head.appendChild(s);}

/* text from the marker: escape it, then allow **bold** and *italic* */
function t(x){
  if(x==null)return '';
  return String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,;:!?]|$)/g,'$1<em>$2</em>');
}
function list(x){if(Array.isArray(x))return x.filter(Boolean);return x?[x]:[];}

/* AQA level bands by mark total */
const BANDS={6:[3,6],9:[3,6,9],12:[4,8,12],15:[3,6,9,12,15],16:[4,8,12,16],20:[4,8,12,16,20],24:[5,10,15,20,24],25:[5,10,15,20,25]};
const NAMES={2:null,3:['Limited','Reasonable','Good'],4:['Limited','Reasonable','Good','Excellent'],5:['Weak','Limited','Reasonable','Good','Excellent']};
function bands(max){return BANDS[max]||[max];}
function levelOf(mark,max){const b=bands(max);if(!(mark>0))return 0;for(let i=0;i<b.length;i++)if(mark<=b[i])return i+1;return b.length;}
function tone(lv,n){if(!lv)return 'var(--nfb-bad)';const r=lv/n;return r>=1?'var(--nfb-good)':r>=.7?'var(--nfb-mid)':r>=.45?'var(--nfb-amber)':'var(--nfb-bad)';}
const DOT={good:'#288566',mid:'#3a69b4',amber:'#d69a2d',bad:'#be4848'};

function header(o){
  const max=+o.max,mark=Math.max(0,Math.min(max,+o.mark||0));
  const b=bands(max),n=b.length,lv=levelOf(mark,max);
  const names=o.names===false?null:(Array.isArray(o.names)?o.names:NAMES[n]);
  const tn=tone(lv,n);
  const name=lv&&names?names[lv-1]:'';
  let lo=0,segs='';
  b.forEach((hi,i)=>{
    const f=mark>=hi?1:mark>lo?(mark-lo)/(hi-lo):0;
    segs+=`<div class="nfb-band${i+1===lv?' on':''}" style="--w:${hi-lo};--f:${Math.round(f*100)}%"><i><b></b></i><small>Level ${i+1}${names?'<span class="nm"> · '+names[i]+'</span>':''}</small></div>`;
    lo=hi;
  });
  const facts=(o.facts||[]).filter(f=>f&&f.value).map(f=>`<span class="nfb-fact" style="--dot:${DOT[f.tone]||'#9aa4b2'}">${t(f.label)}: <b>${t(f.value)}</b></span>`).join('');
  return `<div class="nfb-top" style="--tone:${tn}">
    <div class="nfb-score"><div class="k">Your mark</div><div class="nfb-mark">${mark}<span>/${max}</span></div><div class="nfb-lvl">${lv?'Level '+lv+' of '+n+(name?' · '+name:''):'No marks yet'}</div></div>
    <div class="nfb-sum">
      ${o.question?`<div class="nfb-q">${t(o.question)}</div>`:''}
      ${o.verdict?`<div class="nfb-verdict">${t(o.verdict)}</div>`:''}
      <div class="nfb-bands">${segs}</div>
      ${facts?`<div class="nfb-facts">${facts}</div>`:''}
      ${o.help?`<button type="button" class="nfb-help" onclick="${o.help}">What does each level mean?</button>`:''}
    </div></div>`;
}
function twoUp(o){
  const well=list(o.well);
  const fix=o.fix||{};
  return `<div class="nfb-two">
    <div class="nfb-card nfb-well"><h3>What went well</h3>${Array.isArray(o.well)?'<ul>'+well.map(w=>`<li>${t(w)}</li>`).join('')+'</ul>':`<p>${t(well[0]||'')}</p>`}</div>
    <div class="nfb-card nfb-fix"><h3>Focus on this next</h3>${fix.title?`<p class="t">${t(fix.title)}</p>`:''}<p>${t(fix.text)}</p>${fix.how?`<div class="nfb-how"><div class="l">How to do it</div><p>${t(fix.how)}</p></div>`:''}</div>
  </div>`;
}
function rwInner(r){
  if(!r)return '';
  if(r.wait)return `<div class="nfb-wait">${t(r.wait)}</div>`;
  if(r.error)return `<p style="color:var(--nfb-muted)">${t(r.error)}</p>`;
  return `<div class="nfb-rw"><div class="a"><div class="l">You wrote</div>${t(r.wrote)}</div><div class="b"><div class="l">It could read</div>${t(r.could)}</div></div>${r.why?`<p class="nfb-why">${t(r.why)}</p>`:''}`;
}
function rewrite(r,id){
  if(!r)return '';
  return `<div class="nfb-card"><h3>What it could look like</h3><div${id?` id="${id}"`:''}>${rwInner(r)}</div></div>`;
}
function fillRewrite(id,r){const el=document.getElementById(id);if(el)el.innerHTML=rwInner(r);}
function more(items,note){
  items=(items||[]).filter(i=>i&&(i.text||i.html||(i.list&&i.list.length)));
  if(!items.length)return '';
  const body=items.map(i=>`<div class="nfb-item${i.wide?' nfb-wide':''}"><div class="h">${t(i.title)}${i.tag?`<span class="nfb-tag" style="--dot:${DOT[i.tone]||'#6a7485'}">${t(i.tag)}</span>`:''}</div>${i.html||''}${i.text?`<p>${t(i.text)}</p>`:''}${i.list&&i.list.length?'<ul>'+i.list.map(x=>`<li>${t(x)}</li>`).join('')+'</ul>':''}</div>`).join('');
  return `<details class="nfb-more"><summary><span>More detail${note?`<small>${t(note)}</small>`:''}</span></summary><div class="nfb-grid">${body}</div></details>`;
}

/* the whole results screen */
function build(o){
  injectCSS();
  let h=`<div class="nfb">`;
  h+=header(o);
  h+=twoUp(o);
  if(o.rewrite)h+=rewrite(o.rewrite,o.rewriteId);
  if(o.annotated)h+=`<div class="nfb-card"><h3>Your answer with notes</h3>${o.annotated}</div>`;
  h+=more(o.more,o.moreNote);
  if(o.actions)h+=`<div class="nfb-act">${o.actions}</div>`;
  return h+`</div>`;
}


/* Redraft: before and after */
function redraft(r){
  injectCSS();
  const num=x=>{const m=String(x||'').match(/(\d+)\s*\/\s*(\d+)/);return m?[+m[1],+m[2]]:null;};
  const nw=num(r.new_mark),old=num(r.original_mark);
  let h='<div class="nfb">';
  if(r.type==='full'&&nw){
    const max=nw[1],lv=levelOf(nw[0],max),n=bands(max).length;
    h+=header({mark:nw[0],max,names:[12,16,20,24,25].includes(max)?undefined:false,verdict:r.overall}).replace('<div class="k">Your mark</div>','<div class="k">Your redraft</div>')
      .replace('</div></div>\n    <div class="nfb-sum">',`</div>${old?`<div class="k" style="opacity:.85">Was ${old[0]}/${old[1]}${old[0]<nw[0]?' · up '+(nw[0]-old[0]):old[0]===nw[0]?' · no change':''}</div>`:''}</div>\n    <div class="nfb-sum">`);
  }else{
    h+=`<div class="nfb-top" style="--tone:var(--nfb-mid)"><div class="nfb-score"><div class="k">Your redraft</div><div class="nfb-mark" style="font-size:30px">Section<br>feedback</div></div><div class="nfb-sum">${r.overall?`<div class="nfb-verdict">${t(r.overall)}</div>`:''}<p style="color:var(--nfb-muted);font-size:14px">You redrafted part of an answer, so there is feedback on what changed but no new mark.</p></div></div>`;
  }
  const ST={improved:['Improved','good'],partially:['Getting there','amber'],not_addressed:['Not yet','bad']};
  const imps=(r.improvements||[]).filter(i=>i&&i.area);
  if(imps.length){
    h+=`<div class="nfb-card"><h3>What changed</h3><div class="nfb-changes">`+imps.map(i=>{const s=ST[i.status]||ST.partially;return `<div class="nfb-change"><span class="nfb-tag" style="--dot:${DOT[s[1]]}">${s[0]}</span><div><b>${t(i.area)}</b><p>${t(i.comment)}</p></div></div>`;}).join('')+`</div></div>`;
  }
  h+=twoUp({well:r.what_is_better,fix:{text:r.still_to_work_on}}).replace('<h3>What went well</h3>','<h3>What\'s stronger</h3>').replace('<h3>Focus on this next</h3>','<h3>Still to work on</h3>');
  return h+'</div>';
}

/* marking failed: say why, keep the way back to the answer */
function error(msg,back){
  injectCSS();
  return `<div class="nfb"><div class="nfb-card" style="border-left:5px solid var(--nfb-bad)"><h3>Not marked yet</h3><p>${t(msg)}</p>${back?`<div class="nfb-act" style="justify-content:flex-start;margin-top:16px">${back}</div>`:''}</div></div>`;
}

window.NFb={build,error,redraft,header,twoUp,rewrite,fillRewrite,more,levelOf,bands,text:t,css:injectCSS};
})();
