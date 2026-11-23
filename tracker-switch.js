/* =====================================================================
   Year group switch for the teacher trackers.
   Every tracker keeps its own data (own Worker, own database):
     Year 10 and Year 11 = GCSE tracker (one database; the page sends the year group)
     Year 12 = 7138 tracker, Year 13 = 7132 tracker
   This adds:
   - a "Year 10 | Year 11 | Year 12 | Year 13" switch at the top of each tracker
   - one sign-in: the password you type is also tried on the other
     trackers, so you are signed in to all of them in this tab
   - switching keeps the view you were on (This week, Overview ...)
   - signing out signs you out of all of them
   Same file on all three sites. Only session tokens are kept (in this tab).
   ===================================================================== */
(function(){
"use strict";
const GCSE_API='https://nishkam-tracker-gcse.alevelnishkam.workers.dev';
const SITES={
  10:{label:'Year 10',page:'/nishkam-business/course-tracker.html?g=10',api:GCSE_API,key:'ctg_token'},
  11:{label:'Year 11',page:'/nishkam-business/course-tracker.html?g=11',api:GCSE_API,key:'ctg_token'},
  12:{label:'Year 12',page:'/nishkam-new-alevel/course-tracker.html',api:'https://nishkam-tracker-7138.alevelnishkam.workers.dev',key:'ct8_token'},
  13:{label:'Year 13',page:'/nishkam-alevel/course-tracker.html',api:'https://nishkam-tracker.alevelnishkam.workers.dev',key:'ct_token'}
};
const href=location.href;
const ME=(window.GROUP_HINT||/nishkam-business/.test(href))?(new URLSearchParams(location.search).get('g')==='10'?10:11):/new-alevel|7138/.test(href)?12:13;
const OTHERS=[...new Set(Object.keys(SITES).map(Number).filter(y=>SITES[y].key!==SITES[ME].key).map(y=>SITES[y].key))]
  .map(k=>Object.values(SITES).find(s=>s.key===k));
const $=s=>document.querySelector(s);
const ss={get:k=>{try{return sessionStorage.getItem(k);}catch(e){return null;}},set:(k,v)=>{try{sessionStorage.setItem(k,v);}catch(e){}},del:k=>{try{sessionStorage.removeItem(k);}catch(e){}}};
/* the GitHub Pages copies share sign-ins; the workers.dev copies are separate sites, so link to the GitHub Pages one */
const base=/^(nishkam-bs\.github\.io|127\.0\.0\.1|localhost)$/.test(location.hostname)?'':'https://nishkam-bs.github.io';

const css=`.ys{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden;vertical-align:middle;flex-wrap:wrap}
.ys a,.ys span{font:600 .88rem "IBM Plex Sans",sans-serif;padding:7px 14px;text-decoration:none;color:var(--fg);background:var(--card)}
.ys span{background:var(--fg);color:var(--card)}
.ys a:hover{background:var(--bg2)}
.ys-wrap{margin-bottom:14px}`;
function sw(){
  const w=document.createElement('div');w.className='ys';w.setAttribute('role','group');w.setAttribute('aria-label','Choose year group');
  [10,11,12,13].forEach(y=>{
    if(y===ME){const s=document.createElement('span');s.textContent=SITES[y].label;s.setAttribute('aria-current','page');w.appendChild(s);}
    else{const a=document.createElement('a');a.href=base+SITES[y].page;a.textContent=SITES[y].label;
      a.onclick=()=>{const c=$('#course');if(c)ss.set('ct_view',c.value);};w.appendChild(a);}
  });
  return w;
}
function mount(){
  const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
  /* dashboard header: next to Refresh / Sign out */
  const btns=$('#refresh')&&$('#refresh').parentElement;if(btns){btns.style.alignItems='center';btns.style.flexWrap='wrap';btns.prepend(sw());}
  /* sign-in card */
  const lv=$('#loginView');if(lv){const d=document.createElement('div');d.className='ys-wrap';d.appendChild(sw());lv.prepend(d);}

  /* one sign-in: also try the password on the other trackers */
  const f=$('#lf');
  if(f)f.addEventListener('submit',()=>{
    const pw=($('#pw')||{}).value;if(!pw)return;
    OTHERS.forEach(o=>{
      fetch(o.api+'/teacher',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})})
        .then(r=>r.ok?r.json():null).then(d=>{if(d&&d.token)ss.set(o.key,d.token);}).catch(()=>{});
    });
  },true);
  /* sign out of all of them */
  const lo=$('#logout');if(lo)lo.addEventListener('click',()=>{OTHERS.forEach(o=>ss.del(o.key));ss.del('ct_view');});

  /* keep the view when switching */
  const want=ss.get('ct_view');
  if(want){
    const apply=()=>{const c=$('#course'),dash=$('#dash');if(!c||!dash||dash.hidden)return false;
      ss.del('ct_view');if([...c.options].some(o=>o.value===want)&&c.value!==want){c.value=want;c.dispatchEvent(new Event('change',{bubbles:true}));}return true;};
    if(!apply()){const mo=new MutationObserver(()=>{if(apply())mo.disconnect();});const dash=$('#dash');if(dash)mo.observe(dash,{attributes:true,attributeFilter:['hidden']});setTimeout(()=>mo.disconnect(),20000);}
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
