/* =====================================================================
   Making and marking practice sets (used by the teacher tracker and the
   student practice page). Questions are written by the AI marker through
   the school's proxy, checked here, and marked here or by the AI.
   ===================================================================== */
(function(){
"use strict";
const PROXY='https://nishkam-marker.alevelnishkam.workers.dev';
const MODEL='claude-sonnet-4-6';
const T=window.TAXO,TOP=window.Analysis?window.Analysis.TOP:{};
const SKILLS=T.skills.map(s=>s[0]);

const RULES=`Rules for every question:
- Stay strictly within the AQA A-level Business specification (7138), and only use topics from the topic ids given, which the class has already been taught. Use the specification's own terms: SMART is Specific, Measurable, Accountable, Realistic, Time specific; call Mendelow's grid "stakeholder mapping". Only use formulas from the 7138 formulae sheet.
- Write in British English and plain, clear teacher language. No hype, no emoji, never mention grades or A*.
- Use short fictional UK businesses with realistic numbers when context is needed. Do not use real people.
- Multiple choice: exactly 4 options, one clearly correct, three plausible wrong answers based on real misconceptions. All four options must be about the same length and written in the same style, and the correct one must not be the longest or the most detailed; students should not be able to spot it from its length. No "all of the above" or "none of the above". The explanation says why the answer is right in one or two sentences, without referring to option letters or positions.
- Calculations: give every figure needed, ask for one number, state the unit. "answer" is the number only. "working" shows the method briefly.
- Short questions (6 marks, command word Analyse): "points" lists what a good answer must include.
- Extended questions (9 marks Assess or 15 marks Evaluate): use a short case with data; "guidance" lists what a strong answer would do (analysis chains, use of the case, a supported judgement).`;

const FORMAT=`Return JSON only, no other text:
{"title":"...","items":[
 {"type":"mcq","topic":"<topic id>","skill":"<skill>","q":"...","options":["...","...","...","..."],"answer":0,"explain":"..."},
 {"type":"calc","topic":"<topic id>","skill":"quant","q":"...","answer":12.5,"unit":"%","working":"..."},
 {"type":"short","topic":"<topic id>","skill":"<skill>","q":"...","marks":4,"points":["...","..."]},
 {"type":"extended","topic":"<topic id>","skill":"<skill>","q":"...","case":"...","marks":9,"guidance":["...","..."]}
]}
"skill" is one of: ${SKILLS.join(', ')}. "topic" is one of the topic ids given.`;

async function ask(system,content,maxTokens){
  const ctl=typeof AbortController!=='undefined'?new AbortController():null,tm=ctl?setTimeout(()=>ctl.abort(),150000):0;
  let r;
  try{r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,max_tokens:maxTokens||6000,system,messages:[{role:'user',content}]}),signal:ctl?ctl.signal:undefined});}
  catch(e){throw new Error(e&&e.name==='AbortError'?'The AI took too long to reply. Try again.':'Could not reach the AI. Check your connection and try again.');}
  finally{clearTimeout(tm);}
  if(!r.ok)throw new Error('The AI did not respond ('+r.status+'). Try again in a minute.');
  const d=await r.json();const raw=(d.content||[]).map(c=>c.text||'').join('');
  /* a long set can be cut off before the end: keep every question that came back complete */
  const obj=firstObject(raw);
  if(obj&&(!/"items"\s*:/.test(raw)||Array.isArray(obj.items)))return obj;
  const items=completeItems(raw);
  if(items.length)return {title:(raw.match(/"title"\s*:\s*"([^"]*)"/)||[])[1]||'',items,cut:true};
  if(obj)return obj;
  throw new Error('The reply could not be read. Try again.');
}
/* the complete objects inside the "items" array of a reply that may have been cut off */
function completeItems(raw){
  const k=raw.search(/"items"\s*:\s*\[/);if(k<0)return [];
  const out=[];let depth=0,inStr=false,esc=false,start=-1;
  for(let i=raw.indexOf('[',k)+1;i<raw.length;i++){
    const c=raw[i];
    if(inStr){if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')inStr=false;continue;}
    if(c==='"')inStr=true;
    else if(c==='{'){if(depth===0)start=i;depth++;}
    else if(c==='}'){depth--;if(depth===0&&start>=0){try{out.push(JSON.parse(raw.slice(start,i+1)));}catch(e){}start=-1;}}
    else if(c===']'&&depth===0)break;
  }
  return out;
}
/* the first complete JSON object in the reply, ignoring any text before or after it */
function firstObject(raw){
  for(let a=raw.indexOf('{');a>=0;a=raw.indexOf('{',a+1)){
    let depth=0,inStr=false,esc=false;
    for(let i=a;i<raw.length;i++){
      const c=raw[i];
      if(inStr){if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')inStr=false;continue;}
      if(c==='"')inStr=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){
        try{return JSON.parse(raw.slice(a,i+1));}catch(e){break;}
      }
    }
  }
  return null;
}
const topicLine=id=>{const t=TOP[id];return t?`${id} = ${t.ref} ${t.title}`:'';};

const toNum=s=>{s=String(s==null?'':s).trim().replace(/[−–—]/g,'-').replace(/:\s*1\s*$/,'');const neg=/^\(.*\)$/.test(s.replace(/[^0-9.()\-]/g,''))||/^-|^£\s*-/.test(s);s=s.replace(/[^0-9.]/g,'');if(s==='')return NaN;const n=parseFloat(s);return neg?-n:n;};
/* the number the working ends on (after the last "="), or null */
function finalOf(working){
  const w=String(working||'');const k=w.lastIndexOf('=');if(k<0)return null;
  const m=w.slice(k+1).replace(/[−–—]/g,'-').match(/\(?-?\s*£?\s*[\d,]*\.?\d+/);if(!m)return null;
  const n=toNum(m[0]);return isFinite(n)?n:null;
}
const near=(a,b)=>Math.abs(a-b)<=Math.max(Math.abs(b)*0.01,0.051);
/* every value that counts as right for a calculation: the answer, the figure the working
   reaches (if the two disagree, the working is shown to students, so it must count too),
   and the same figure written out in full when the unit is £m, £bn or £000 */
function rightValues(it){
  const base=[it.answer];const f=finalOf(it.working);if(f!=null&&!near(f,it.answer))base.push(f);
  const u=String(it.unit||'').toLowerCase(),out=[];
  base.forEach(v=>{out.push(v);
    if(/\bm\b|£m|million/.test(u))out.push(v*1e6);
    if(/bn|billion/.test(u))out.push(v*1e9);
    if(/000|thousand|\bk\b/.test(u))out.push(v*1e3);});
  return out;
}
function calcOk(it,a){const n=toNum(a);return isFinite(n)&&rightValues(it).some(v=>near(n,v));}
/* what to show as the answer: where the answer and the working disagree, the working */
function shownAnswer(it){const f=finalOf(it.working);return f!=null&&!near(f,it.answer)?f:it.answer;}

function clean(spec,topicIds){
  const ok=new Set(topicIds&&topicIds.length?topicIds:Object.keys(TOP));
  const items=(spec.items||[]).map(it=>{
    if(!it||!it.q)return null;
    const o={type:it.type,topic:ok.has(it.topic)?it.topic:(TOP[it.topic]?it.topic:(topicIds||[])[0]||null),skill:SKILLS.includes(it.skill)?it.skill:'knowledge',q:String(it.q)};
    if(it.type==='mcq'){
      if(!Array.isArray(it.options)||it.options.length!==4)return null;
      const a=+it.answer;if(!(a>=0&&a<4))return null;
      /* shuffle so the right answer is not always in the same place */
      const order=[0,1,2,3];for(let k=3;k>0;k--){const j=Math.floor(Math.random()*(k+1));[order[k],order[j]]=[order[j],order[k]];}
      o.options=order.map(i=>String(it.options[i]));o.answer=order.indexOf(a);o.explain=String(it.explain||'');
    }else if(it.type==='calc'){
      const n=parseFloat(String(it.answer).replace(/[^0-9.\-]/g,''));if(!isFinite(n))return null;
      o.answer=n;o.unit=String(it.unit||'');o.working=String(it.working||'');o.skill='quant';
      /* the answer must match what the working works out */
      const f=finalOf(o.working);if(f!=null&&!near(f,n)&&!near(f,n/100)&&!near(f,n*100))return null;
    }else if(it.type==='short'){
      o.marks=Math.max(1,Math.min(8,+it.marks||(it.points||[]).length||2));o.points=(it.points||[]).map(String);
    }else if(it.type==='extended'){
      o.marks=[9,12,16,20,25].includes(+it.marks)?+it.marks:9;o.case=String(it.case||'');o.guidance=(it.guidance||[]).map(String);
    }else return null;
    return o;
  }).filter(Boolean);
  return {title:String(spec.title||'Practice'),items};
}

/* req: {topics:[ids], counts:{mcq,calc,short,extended}, extendedMarks, about:'text summary of the student', title, note} */
async function generate(req){
  const c=Object.assign({mcq:0,calc:0,short:0,extended:0},req.counts||{});
  const total=c.mcq+c.calc+c.short+c.extended;if(!total)throw new Error('Choose at least one question.');
  let topics=(req.topics||[]).filter(id=>TOP[id]);
  if(!topics.length)topics=(T.taught||[]).filter(id=>TOP[id]);
  const sys=`You write practice questions for a Year 12 student on AQA A-level Business (7138).\n\n${RULES}\n\n${FORMAT}`;
  const user=[
    (req.topics||[]).length?`Topics to cover (spread the questions across them, weakest first):\n${topics.map(topicLine).join('\n')}`:`This student has no clear gaps yet. Set stretching questions spread across these topics, which the class has been taught. Do not use any other topics:\n${topics.map(topicLine).join('\n')}`,
    req.about?`What we know about this student:\n${req.about}\nAim the questions at their gaps. Pitch them so they are challenging but fair.`:'',
    `Write exactly: ${c.mcq} multiple choice, ${c.calc} calculation, ${c.short} short answer, ${c.extended} extended (${req.extendedMarks||9} marks).`,
    req.note?`Teacher's note: ${req.note}`:'',
    `Title for the set: ${req.title||'a short plain title naming the topics'}`
  ].filter(Boolean).join('\n\n');
  const tokens=Math.min(12000,1500+total*700);
  let spec;
  try{spec=clean(await ask(sys,user,tokens),topics);}
  catch(e){spec=clean(await ask(sys,user,tokens),topics);}
  spec.items=await checked(spec.items);
  /* if some questions are missing (a long reply cut off, or ones that failed the checks), ask once more for just those */
  const have=t=>spec.items.filter(it=>it.type===t).length;
  const miss={mcq:Math.max(0,c.mcq-have('mcq')),calc:Math.max(0,c.calc-have('calc')),short:Math.max(0,c.short-have('short')),extended:Math.max(0,c.extended-have('extended'))};
  const nMiss=miss.mcq+miss.calc+miss.short+miss.extended;
  if(nMiss){
    const user2=user.replace(/Write exactly: [^\n]*/,`Write exactly: ${miss.mcq} multiple choice, ${miss.calc} calculation, ${miss.short} short answer, ${miss.extended} extended (${req.extendedMarks||9} marks).`);
    try{const more=clean(await ask(sys,user2,Math.min(12000,1500+nMiss*700)),topics);more.items=await checked(more.items);spec.items=spec.items.concat(more.items);if(!spec.title||spec.title==='Practice')spec.title=more.title;}catch(e){}
  }
  if(!spec.items.length)throw new Error('No usable questions came back. Try again.');
  if(req.title)spec.title=req.title;
  return spec;
}

/* multiple choice and calculations are worked out again by a separate examiner pass before
   anyone sees them; any it disagrees with are dropped. Written questions are kept as they are. */
async function checked(items){
  const auto=items.filter(it=>it.type==='mcq'||it.type==='calc');
  if(!auto.length)return items;
  let keep;
  try{keep=new Set((await verify({items:auto})).items);}catch(e){return items;}
  return items.filter(it=>!(it.type==='mcq'||it.type==='calc')||keep.has(it));
}
/* re-mark the calculations in a finished set with the current rules (answers written in full,
   answers that match the working). Returns null if nothing changes. */
function recheck(spec,answers,result){
  if(!result||!Array.isArray(result.items))return null;
  const items=spec.items||[];let changed=false;
  const out=result.items.map((r,i)=>{const it=items[i];if(!it||it.type!=='calc'||!r)return r;
    const ok=calcOk(it,(answers||{})[i])?1:0;if(ok===r.ok)return r;changed=true;return Object.assign({},r,{ok,marks:ok*2,max:2});});
  if(!changed)return null;
  return {items:out,score:out.reduce((a,r)=>a+(r?r.marks:0),0),total:out.reduce((a,r)=>a+(r?r.max:0),0)};
}

/* mark a set: multiple choice and calculations here, written answers by the AI */
async function mark(spec,answers){
  const items=spec.items||[],res=items.map(()=>null),open=[];
  items.forEach((it,i)=>{
    const a=answers[i];
    if(it.type==='mcq')res[i]={ok:+a===it.answer?1:0,marks:+a===it.answer?1:0,max:1};
    else if(it.type==='calc'){
      const ok=calcOk(it,a)?1:0;
      res[i]={ok,marks:ok*2,max:2};
    }else open.push(i);
  });
  if(open.length){
    const sys=`You mark a Year 12 student's answers to AQA A-level Business (7138) practice questions. Mark fairly against the points or guidance given, as an AQA examiner would. Give credit for correct points made in different words. Feedback is to the student as "you", in plain British English, one or two sentences: what was good and the one thing that would gain more marks. "better" is a short example of how one weak sentence could read (empty if the answer was strong). Return JSON only: {"marks":[{"i":0,"marks":0,"feedback":"","better":""}]}`;
    const body=open.map(i=>{const it=items[i];return `Item ${i} (${it.marks} marks): ${it.case?'Case: '+it.case+'\n':''}Question: ${it.q}\n${it.type==='short'?'Mark points: '+it.points.join(' | '):'A strong answer would: '+it.guidance.join(' | ')}\nStudent's answer: ${String(answers[i]||'').trim()||'(no answer)'}`;}).join('\n\n');
    const d=await ask(sys,body,1500+open.length*500);
    (d.marks||[]).forEach((m,k)=>{const i=open.includes(+m.i)?+m.i:open[k];if(i==null||res[i])return;const it=items[i];const mk=Math.max(0,Math.min(it.marks,+m.marks||0));
      res[i]={ok:mk/it.marks,marks:mk,max:it.marks,feedback:String(m.feedback||''),better:String(m.better||'')};});
    open.forEach(i=>{if(!res[i])res[i]={ok:0,marks:0,max:items[i].marks,feedback:'This answer could not be marked. Ask your teacher to look at it.'};});
  }
  const score=res.reduce((a,r)=>a+r.marks,0),total=res.reduce((a,r)=>a+r.max,0);
  return {items:res,score,total};
}

const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const typeName={mcq:'Multiple choice',calc:'Calculation',short:'Short answer',extended:'Extended answer'};
const label=it=>{const t=TOP[it.topic];return (t?`${t.ref} ${t.title}`:'')+(it.marks?` · ${it.marks} marks`:'');};

/* a second, independent check before anything is sent automatically:
   an examiner works out every question without being told the answer.
   Anything it disagrees with is dropped. */
async function verify(spec){
  const items=spec.items||[];
  const sys=`You are an experienced AQA A-level Business (7138) examiner checking practice questions before a student sees them. Work each one out yourself.
- Multiple choice: give the index (0-3) of the one correct option, or -1 if no option is correct, more than one could be defended, or the question is unclear.
- Calculation: work it out and give the number only.
- Short answer: "ok" is true only if the question is clear, on the 7138 specification, and every mark point is accurate.
If a recap is given, "recap_ok" is true only if every statement in it is accurate and on the 7138 specification.
Return JSON only: {"items":[{"i":0,"answer":0,"ok":true,"issue":""}],"recap_ok":true,"recap_issue":""}`;
  const body=items.map((it,i)=>it.type==='mcq'?`Item ${i} (multiple choice): ${it.q}\n${it.options.map((o,k)=>k+') '+o).join('\n')}`
    :it.type==='calc'?`Item ${i} (calculation, answer in ${it.unit||'the unit asked'}): ${it.q}`
    :`Item ${i} (short answer, ${it.marks} marks): ${it.q}\nMark points: ${(it.points||[]).join(' | ')}`).join('\n\n')+(spec.recap?`\n\nRecap:\n${spec.recap}`:'');
  const d=await ask(sys,body,2500+items.length*300);
  const res={};(d.items||[]).forEach(r=>{if(r&&r.i!=null)res[+r.i]=r;});
  const keep=items.filter((it,i)=>{const r=res[i];if(!r)return false;
    if(it.type==='mcq')return +r.answer===it.answer;
    if(it.type==='calc'){const n=parseFloat(String(r.answer==null?'':r.answer).replace(/[^0-9.\-]/g,''));return isFinite(n)&&Math.abs(n-it.answer)<=Math.max(Math.abs(it.answer)*0.01,0.051);}
    if(it.type==='short')return r.ok===true;
    return false;});
  return Object.assign({},spec,{items:keep,recap:spec.recap&&d.recap_ok===true?spec.recap:''});
}
/* a short recap of one topic, for a follow-up set */
async function recap(topicId,about){
  const t=TOP[topicId];if(!t)return '';
  const sys=`You write a short recap of one topic for a Year 12 student on AQA A-level Business (7138), as their teacher would. 80 to 130 words, plain British English, no headings, no lists, no hype. Explain the idea accurately, then the point students most often get wrong about it. Stay strictly within the 7138 specification. Return JSON only: {"recap":"..."}`;
  const d=await ask(sys,`Topic: ${t.ref} ${t.title}${about?`\n\nWhat this student has been getting wrong:\n${about}`:''}`,800);
  return String(d.recap||'').trim();
}

window.WorkGen={generate,mark,clean,verify,recap,recheck,shownAnswer,calcOk,esc,typeName,label};
})();
