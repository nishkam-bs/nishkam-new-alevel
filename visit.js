/* Tells the teacher tracker which page a signed-in student has opened (at most once every 10 minutes per page).
   Sends only the page name and title. Does nothing if nobody is signed in on this device. */
(function(){
"use strict";
try{
  const LS=window.localStorage;
  const override=LS.getItem('n8_api');
  if(!override&&!/github\.io$|alevelnishkam\.workers\.dev$/.test(location.hostname))return;
  const auth=JSON.parse(LS.getItem('n8_auth')||'null');
  if(!auth||!auth.token)return;
  const parts=location.pathname.split('/').filter(Boolean),slash=location.pathname.endsWith('/');
  const file=decodeURIComponent(slash?'index.html':(parts.pop()||'index.html'));
  const dir=parts.length&&/^unit/i.test(parts[parts.length-1])?parts[parts.length-1]+'/':'';
  const page=(dir+file.replace(/\.html$/,''))||'index';
  const q=new URLSearchParams(location.search),extra=q.get('d')||q.get('set')||q.get('q')||'';
  const key='n8_visit:'+page+extra,last=+(LS.getItem(key)||0);
  if(Date.now()-last<10*60000)return;
  LS.setItem(key,String(Date.now()));
  const title=(document.title||page).replace(/\s*[|·–—-]\s*Nishkam.*$/i,'').replace(/^AQA A-Level Business\s*[—–:-]\s*/i,'').replace(/\s*[—–-]\s*AQA A-Level Business.*$/i,'').trim().slice(0,100)+(extra?' ('+extra+')':'');
  fetch((override||'https://nishkam-tracker-7138.alevelnishkam.workers.dev')+'/visit',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({token:auth.token,page:(page+(extra?'-'+extra:'')).slice(0,80),title}),keepalive:true}).catch(()=>{});
}catch(e){}
})();
