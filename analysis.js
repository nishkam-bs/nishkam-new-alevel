/* =====================================================================
   Works out what a student knows and where the gaps are, from:
   - course questions (each tagged with a spec topic and a skill)
   - blurting scores (by spec topic)
   - marked answers and quizzes (topic found from the question and the
     feedback text; skills from the feedback text)
   - work set by the teacher or made by the student
   Used by the teacher tracker and by the student practice page.
   Needs taxonomy.js. No student data in this file.
   ===================================================================== */
(function(){
"use strict";
const T=window.TAXO;
const TOP={};T.topics.forEach(([id,unit,ref,title])=>{TOP[id]={id,unit,ref,title};});
const BYREF={};T.topics.forEach(([id,,ref])=>{(BYREF[ref]=BYREF[ref]||[]).push(id);});
const SKILL=Object.fromEntries(T.skills);
const KW=Object.entries(T.kw);

/* which topics a piece of text is about (best first) */
function topicsIn(text,max){
  const t=' '+String(text||'').toLowerCase().replace(/[’']/g,"'")+' ';
  const hit={};
  for(const [id,ws] of KW)for(const w of ws){if(t.includes(w))hit[id]=(hit[id]||0)+(w.length>9?2:1);}
  for(const m of t.matchAll(/\b(3\.[1-3]\.\d)\b/g)){const ids=BYREF[m[1]];if(ids)ids.forEach(id=>{hit[id]=(hit[id]||0)+2/ids.length;});}
  return Object.entries(hit).sort((a,b)=>b[1]-a[1]).filter(([,v])=>v>=1).slice(0,max||2).map(([id])=>id);
}
const SKW={
  analysis:['chain','endpoint','end point','causal','mechanism','develop the','link to profit','links to profit','consequence','knock-on','because','explain why','analys'],
  evaluation:['judgement','judgment','conclusion','conclude','weigh','depends on','it depends','evaluat','balance','counter-argument','counter argument','overall','most important','to what extent','justify'],
  application:['context','the case','case study','data','apply','applied','application','generic','the business in the question','this business','specific to'],
  knowledge:['definition','define','confus','conflat','incorrect','not correct','mixes up','mixed up','misunderstand','terminology','knowledge'],
  quant:['calculat','workings','formula','percentage','ratio','figure','numerical','arithmetic'],
  models:['model','porter','ansoff','maslow','herzberg','taylor','boston','swot','pestle','framework','theory','lewin','kotter','tannenbaum','force field','bcg'],
  technique:['the question asks','command word','focus on the question','answer the question','stay on','timing','structure','paragraph','plan']
};
function skillsIn(text){
  const t=String(text||'').toLowerCase();const out=[];
  for(const [k,ws] of Object.entries(SKW))if(ws.some(w=>t.includes(w)))out.push(k);
  return out;
}
const pct=m=>{const x=String(m||'').match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);return x&&+x[2]?Math.min(100,+x[1]/+x[2]*100):null;};
const isEssay=tool=>/6-mark|9-mark|15-mark|redraft|lab/i.test(tool||'');
const isCalc=tool=>/calc/i.test(tool||'');
const segs=s=>String(s||'').split(/\s\/\s|\s\|\s|;|\n|(?<=\.)\s+(?=[A-Z])/).map(x=>x.trim()).filter(x=>x.length>12);

/* d = {store:{'course:key':state,'blurt:history':{}}, marks:[], attempts:[], work:[]} */
function analyse(d){
  d=d||{};const store=d.store||{},ev=[];
  /* courses */
  for(const [key,off,cname] of T.courses){
    const st=store['course:'+key],tags=T.tags[key]||{};
    const add=(id,ok)=>{const tg=tags[id]||[null,null];ev.push({topic:tg[0],skill:tg[1],w:1,ok,src:'course',label:cname});};
    if(st&&st.seen){
      for(const [sid,ids] of Object.entries(st.seen||{})){
        const wrong=new Set((st.wrong||{})[sid]||[]);
        (ids||[]).forEach(id=>add(id,wrong.has(id)?0:1));
        wrong.forEach(id=>{if(!(ids||[]).includes(id))add(id,0);});
      }
    }else{
      (d.attempts||[]).filter(a=>a.stage>off&&a.stage<off+100).forEach(a=>{
        (a.missed||[]).forEach(m=>{const id=String(m).split(' ')[0];if(/^\d+\.\d+$/.test(id)){const tg=tags[id]||[null,null];ev.push({topic:tg[0],skill:tg[1],w:.5,ok:0,src:'course',label:cname});}});
      });
    }
  }
  /* blurting */
  Object.entries(store['blurt:history']||{}).forEach(([id,h])=>{if(TOP[id]&&h&&h.total)ev.push({topic:id,skill:'knowledge',w:3,ok:h.got/h.total,src:'blurt',label:'Blurting'});});
  /* marked answers and quizzes */
  const essays=[],calcNotes=[],calcRows=[];
  (d.marks||[]).forEach(m=>{
    const p=pct(m.mark),calc=isCalc(m.tool),essay=isEssay(m.tool);
      if(calc&&p!=null&&p<100&&m.improve)calcNotes.push({t:m.t,q:m.question,text:String(m.improve)});
    if(calc&&p!=null){const mm=String(m.mark).match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);calcRows.push({t:m.t,q:String(m.question||''),p:p/100,lost:mm?+mm[2]-+mm[1]:0});}
    const qt=topicsIn(m.question,calc?1:2);
    if(p!=null){
      qt.forEach(t=>ev.push({topic:t,skill:calc?'quant':null,w:calc?1:1.5,ok:p/100,src:'mark',label:m.tool}));
      if(essay)essays.push({t:m.t,tool:m.tool,p,q:m.question,mark:m.mark});
      if(calc&&!qt.length)ev.push({topic:null,skill:'quant',w:1,ok:p/100,src:'mark',label:m.tool});
      if(!qt.length){
        /* quizzes on a whole unit, e.g. "Unit 7: ..." or "Units 1-6" */
        const um=String(m.question).match(/units?\s*3\.(\d+)(?:\s*[-–]\s*3\.(\d+))?/i)||String(m.question).match(/units?\s*(\d+)(?:\s*[-–]\s*(\d+))?/i);
        if(um){const a1=+um[1],b1=+(um[2]||um[1]);for(let u=a1;u<=Math.min(b1,10);u++)ev.push({unit:'3.'+u,topic:null,skill:null,w:1/(b1-a1+1),ok:p/100,src:'mark',label:m.tool});}
      }
    }
    [[m.well,1],[m.improve,0]].forEach(([txt,ok])=>segs(txt).forEach(sg=>{
      const tp=topicsIn(sg,1)[0];
      if(tp&&!essay&&!calc)ev.push({topic:tp,skill:null,w:.6,ok,src:'feedback',label:m.tool});
      if(essay||calc)skillsIn(sg).forEach(k=>ev.push({topic:null,skill:k,w:.5,ok,src:'feedback',label:m.tool}));
    }));
  });
  /* set work and own practice */
  (d.work||[]).forEach(w=>{
    if(w.status!=='done'||!w.result||!Array.isArray(w.result.items))return;
    const items=(w.spec&&w.spec.items)||[];
    w.result.items.forEach((r,i)=>{const it=items[i]||{};if(r&&typeof r.ok==='number')ev.push({topic:TOP[it.topic]?it.topic:null,skill:SKILL[it.skill]?it.skill:null,w:it.type==='extended'?2:1,ok:r.ok,src:'work',label:w.title});});
  });

  /* totals */
  const agg=(key)=>{const o={};ev.forEach(e=>{const k=e[key];if(!k)return;const x=o[k]=o[k]||{n:0,s:0,src:{}};x.n+=e.w;x.s+=e.w*e.ok;x.src[e.label]=(x.src[e.label]||0)+e.w;});
    Object.values(o).forEach(x=>{x.score=x.n?x.s/x.n:null;});return o;};
  const topics=agg('topic'),skills=agg('skill');
  const units={};
  Object.entries(topics).forEach(([id,x])=>{const u=TOP[id].unit,y=units[u]=units[u]||{n:0,s:0};y.n+=x.n;y.s+=x.s;});
  ev.forEach(e=>{if(e.unit){const y=units[e.unit]=units[e.unit]||{n:0,s:0};y.n+=e.w;y.s+=e.w*e.ok;}});
  Object.values(units).forEach(y=>{y.score=y.n?y.s/y.n:null;});
  const gaps=Object.entries(topics).filter(([,x])=>x.n>=1.5&&x.score<.6).sort((a,b)=>a[1].score-b[1].score||b[1].n-a[1].n).map(([id,x])=>Object.assign({id},TOP[id],x));
  /* calculation areas: a marked paper splits a topic into smaller areas (e.g. PED and YED are both
     "Demand and elasticity"), so a weak area can be hidden by a strong one. Keep the latest mark for
     each area and add weak ones to the gaps. */
  const latest={};calcRows.sort((a,b)=>String(a.t).localeCompare(String(b.t))).forEach(r=>{latest[r.q]=r;});
  const calcGaps=Object.values(latest).filter(r=>r.p<.7&&!/whole paper/i.test(r.q)).sort((a,b)=>b.lost-a.lost||a.p-b.p).map(r=>{
    const label=r.q.replace(/^[^:]*:\s*/,'').replace(/\s*\(.*$/,'');return {label,score:r.p,topic:topicsIn(r.q,1)[0]||null};});
  calcGaps.forEach(c=>{if(!c.topic||!TOP[c.topic])return;const g=gaps.find(x=>x.id===c.topic);
    if(g){g.calc=(g.calc?g.calc+'; ':'')+c.label;g.cs=(g.cs||[]).concat(c.score);if(g.base==null)g.base=g.cs.length>1?1:g.score;
      g.score=Math.min(g.base,g.cs.reduce((x,y)=>x+y,0)/g.cs.length);}
    else gaps.push(Object.assign({id:c.topic},TOP[c.topic],{n:1.5,s:c.score*1.5,score:c.score,src:{},calc:c.label,cs:[c.score],base:1}));});
  gaps.sort((a,b)=>(b.calc?1:0)-(a.calc?1:0)||a.score-b.score);
  const strengths=Object.entries(topics).filter(([,x])=>x.n>=3&&x.score>=.8).sort((a,b)=>b[1].score-a[1].score||b[1].n-a[1].n).map(([id,x])=>Object.assign({id},TOP[id],x));
  const weakSkills=Object.entries(skills).filter(([,x])=>x.n>=2).sort((a,b)=>a[1].score-b[1].score).map(([k,x])=>Object.assign({key:k,name:SKILL[k]},x));
  essays.sort((a,b)=>String(a.t).localeCompare(String(b.t)));
  calcNotes.sort((a,b)=>String(b.t).localeCompare(String(a.t)));
  return {topics,skills,units,gaps,strengths,weakSkills,essays,calcNotes,calcGaps,evidence:ev.length};
}
function status(x){if(!x||!x.n)return 'none';if(x.score>=.75)return 'secure';if(x.score>=.5)return 'patchy';return 'gap';}
function nextSteps(a){
  const out=[];
  a.gaps.slice(0,2).forEach(g=>out.push(g.calc?`Practise the calculations on ${g.calc} (${g.ref} ${g.title}) - about ${Math.round(g.score*100)}% right so far.`:`Revise ${g.ref} ${g.title} - about ${Math.round(g.score*100)}% right so far.`));
  const ws=a.weakSkills[0];
  if(ws&&ws.score<.7){
    const tip={analysis:'Practise building chains of reasoning that end at the business outcome the question asks about.',
      evaluation:'Practise judgements: say what your answer depends on and which side outweighs the other.',
      application:'Use the business in the question in every point, including its data.',
      knowledge:'Learn the definitions and the pairs of ideas that get mixed up.',
      quant:'Practise calculations and show your workings every time.',
      models:'Use models as a step in the argument, not just a name.',
      technique:'Read the question carefully and stay focused on what it asks.'}[ws.key];
    out.push(`${ws.name}: ${tip}`);
  }
  if(out.length<3&&a.gaps[2])out.push(`Revise ${a.gaps[2].ref} ${a.gaps[2].title}.`);
  return out.slice(0,3);
}
/* short text summary, used when asking the AI to write feedback or make work */
function summary(a,maxGaps){
  const f=x=>`${Math.round(x.score*100)}% (${Math.round(x.n)} pieces of evidence)`;
  const lines=[];
  lines.push('Units: '+T.units.map(u=>{const x=a.units[u.unit];return `${u.unit} ${u.title} ${x&&x.n>=1?Math.round(x.score*100)+'%':'no evidence'}`;}).join('; '));
  lines.push('Skills: '+T.skills.map(([k,n])=>{const x=a.skills[k];return `${n} ${x&&x.n?f(x):'no evidence'}`;}).join('; '));
  if(a.gaps.length)lines.push('Weakest topics: '+a.gaps.slice(0,maxGaps||8).map(g=>`${g.id} (${g.ref} ${g.title}${g.calc?', calculations on '+g.calc:''}) ${f(g)}`).join('; '));
  if(a.calcGaps&&a.calcGaps.length)lines.push('Weakest calculation areas in marked papers: '+a.calcGaps.slice(0,6).map(c=>`${c.label} ${Math.round(c.score*100)}%`).join('; '));
  if(a.strengths.length)lines.push('Strongest topics: '+a.strengths.slice(0,6).map(g=>`${g.ref} ${g.title} ${f(g)}`).join('; '));
  if(a.calcNotes&&a.calcNotes.length)lines.push('Mistakes in marked calculations (set questions that practise these): '+a.calcNotes.slice(0,6).map(n=>n.text.replace(/\s+/g,' ').slice(0,700)).join(' | '));
  if(a.essays.length)lines.push('Extended answers (oldest first): '+a.essays.slice(-10).map(e=>`${e.tool} ${Math.round(e.p)}%`).join(', '));
  return lines.join('\n');
}
window.Analysis={analyse,status,nextSteps,summary,topicsIn,skillsIn,pct,TOP,SKILL};
})();
