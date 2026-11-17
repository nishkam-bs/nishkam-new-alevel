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
  const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,max_tokens:maxTokens||6000,system,messages:[{role:'user',content}]})});
  if(!r.ok)throw new Error('The AI did not respond ('+r.status+'). Try again in a minute.');
  const d=await r.json();const raw=(d.content||[]).map(c=>c.text||'').join('');
  const obj=firstObject(raw);if(!obj)throw new Error('The reply could not be read. Try again.');
  return obj;
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
  let spec;
  try{spec=clean(await ask(sys,user,Math.min(12000,1500+total*700)),topics);}
  catch(e){spec=clean(await ask(sys,user,Math.min(12000,1500+total*700)),topics);}
  if(!spec.items.length)throw new Error('No usable questions came back. Try again.');
  if(req.title)spec.title=req.title;
  return spec;
}

/* mark a set: multiple choice and calculations here, written answers by the AI */
async function mark(spec,answers){
  const items=spec.items||[],res=items.map(()=>null),open=[];
  items.forEach((it,i)=>{
    const a=answers[i];
    if(it.type==='mcq')res[i]={ok:+a===it.answer?1:0,marks:+a===it.answer?1:0,max:1};
    else if(it.type==='calc'){
      const n=parseFloat(String(a==null?'':a).replace(/[^0-9.\-]/g,''));
      const tol=Math.max(Math.abs(it.answer)*0.01,0.051);
      const ok=isFinite(n)&&Math.abs(n-it.answer)<=tol?1:0;
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

window.WorkGen={generate,mark,clean,esc,typeName,label};
})();
