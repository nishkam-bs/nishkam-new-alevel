/* =====================================================================
   Teacher tracker: make a printable resource from a point in the
   feedback report ("Go over these in lessons" / "Say this in lessons").

   For one teaching point it writes:
     - a short explanation, a real exam question,
     - an answer that loses marks, with notes on exactly where and why,
     - the same part written for full marks, with notes,
     - a complete full-mark answer,
     - tasks with writing space, and answers for the teacher.
   Then it checks the work three times before you can download it:
     1. an examiner check of accuracy, levels, notes and wording
     2. a blind re-mark: a fresh examiner marks the exemplars without
        being told the intended marks
     3. a final proofread of facts, figures, quotes and wording
   Anything found is fixed and checked again. Files are made in the
   browser: a Word worksheet (print-ready, with writing lines) and a
   PowerPoint for the lesson. Same file on the 7132 and 7138 sites.
   Uses NMark (marking-uploads.js), TR, vendor/docx.umd.js and
   vendor/pptxgen.bundle.js (loaded only when needed).
   ===================================================================== */
(function(){
"use strict";
const IS12=/new-alevel|7138/.test(location.href);
const SPEC=IS12?'7138':'7132',YEAR=IS12?'Year 12':'Year 13';
const MODEL='claude-sonnet-4-6';
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const $=(s,r)=>(r||document).querySelector(s),$$=(s,r)=>[...(r||document).querySelectorAll(s)];

/* ---------- the standard the exemplars are written and checked against ---------- */
const LEVELS=IS12?{
  6:`Level 2 (4-6): good response, relevant knowledge, effective application throughout, accurate chain of reasoning linking the starting factor to the exact endpoint the question asks about. Level 1 (1-3): some knowledge, an attempt at application, but the chain is missing or does not reach the endpoint; often generic.`,
  9:`Level 3 (7-9): accurate knowledge, good application to the context, logical chains reaching the endpoint, and evaluation that weighs the arguments and reaches a convincing judgement that directly answers the question. Level 2 (4-6): relevant knowledge, some application, basic chains; evaluation with some support but does not genuinely weigh the arguments (a conclusion that summarises both sides is Level 2). Level 1 (1-3): limited; evaluation is assertion.`,
  15:`Level 5 (13-15): fully focused; application throughout; well-developed chains for both options; evaluation that weighs both options and reaches a coherent overall judgement tied to the business's priorities. Level 4 (10-12): developed chains for both options, supported evaluation with some balance. Level 3 (7-9): some developed chains, evaluation with some support but lacks balance/focus. Level 2 (4-6): basic chains, mostly generic. Level 1 (1-3): weak, assertion.`
}:{
  9:`AQA: Level 3 (7-9): a good response that focuses on many of the demands of the question; depth and range of knowledge; analysis well developed and applied effectively to the context. Level 2 (4-6): reasonable; analysis developed and applied but less depth. Level 1 (1-3): limited; little development, mainly descriptive. AO1=3, AO2=3, AO3=3.`,
  12:`AQA: Level 3 (9-12): a good response focused on the demands of the question; analysis well developed and applied effectively. Level 2 (5-8): reasonable, developed analysis but less depth. Level 1 (1-4): limited, mainly descriptive.`,
  16:`AQA: Level 4 (13-16): excellent, fully focused; precise, well-selected knowledge; analysis well developed throughout, applied effectively, balanced range of issues; judgements built effectively on the analysis, balanced, focused on the question as a whole. Level 3 (9-12): good; analysis well developed; judgements built on analysis and balanced. Level 2 (5-8): reasonable; judgements built on analysis but lack balance or focus. Level 1 (1-4): limited.`,
  20:`AQA: Level 5 (17-20) excellent and fully focused with effective, balanced, supported judgement; Level 4 (13-16) good; Level 3 (9-12) reasonable, judgements lack balance; Level 2 (5-8) limited; Level 1 (1-4) weak. If the question names appendices or asks for calculations, an answer that does not use them should not go above Level 4.`,
  24:`AQA: Level 5 (21-24): excellent, well organised, logical chain of reasoning, range of relevant issues, well-supported focused judgement, analysis making connections. Level 4 (16-20): good, developed analysis, balanced, supported judgement. Level 3 (11-15) reasonable. Level 2 (6-10) limited. Level 1 (1-5) weak.`,
  25:`AQA: Level 5 (21-25): precise knowledge; well-developed analysis; effective integrated application; strong focus on the question; balanced consideration and effective judgement supported by the analysis. Level 4 (16-20): good, developed analysis, supported judgement but less sustained. Level 3 (11-15): reasonable, evaluation lacks depth or resolution. Level 2 (6-10): limited. Level 1 (1-5): weak.`
};
const SHAPE=IS12?{
  6:'One factor, one well-developed chain from the starting factor to the exact endpoint, using the case context throughout. No evaluation needed.',
  9:'Argument for, argument against, then a judgement that weighs them and answers the question directly. Use the context throughout.',
  15:'Analyse both options with developed chains using the context, evaluate each, then recommend one, weighing them against the business\'s priorities.'
}:{
  9:'One detailed paragraph with 6 to 7 linked steps of reasoning from the start point to the end point the question asks about. No second argument, no counter-argument, no conclusion. If data is given, calculate with it (do not just quote it); use two pieces of data when a table is provided. Weave a relevant model in where it genuinely helps. The last sentence begins "Therefore" and uses the words of the question.',
  12:'One fully developed argument (the examiner-endorsed approach), well applied to the case, reaching the end point in the question. Use and calculate data where it is given.',
  16:'Paper 2: no introduction. An argument for, an argument against, then a conclusion that weighs them: which matters most, what it depends on, and a clear answer in the words of the question. Each paragraph ends by linking back to the question. For "all businesses" questions, use contrasting real businesses beyond the case and explain why the argument changes between them. No new points in the conclusion.',
  20:'Use the appendices and calculate with the data. Arguments both ways, developed and applied, then a weighted, supported judgement.',
  24:'"All businesses" style: a short introduction is optional. Two developed arguments using contrasting real businesses, each evaluated, then a weighted conclusion that says what the answer depends on. Must go beyond the case business.',
  25:'An optional two-sentence introduction (position, main reason). Two developed arguments with evaluation, then a weighted conclusion that says which factor matters most and why, and what it depends on. No new points in the conclusion.'
};
const RULES=`House rules for this teacher's resources:
- Plain, natural teacher language. No hype or promotional words, no emoji, no "A*" (say "top grade"), no capitals for emphasis, no invented named frameworks or acronyms.
- Never use these models (removed from the AQA spec): Bowman's Strategic Clock, Blake Mouton, Hackman and Oldham, Kaplan and Norton, Greiner, Bartlett and Ghoshal, Hofstede. Call Mendelow "stakeholder mapping".
- Common errors to get right: cash flow is not profit; operating profit is not operating profit margin; PRP is not piece rate; economies of scope are not economies of scale; contribution is not revenue; Herzberg: pay is a hygiene factor (its absence demotivates; it does not motivate), hygiene factors and motivators are two separate sets of factors, not a hierarchy; Maslow is the hierarchy; reverse percentages divide by (1 + the % change as a decimal); ARR subtracts the initial cost; margin of safety is in units.
- Data must be calculated, not just quoted. Calculations show the formula, working, units and currency signs.
- Analysis means explaining why each step leads to the next, reaching the exact end point in the question. Linking words alone earn nothing.
- "Always" and "all businesses" claims must be challenged for evaluation credit.
- Do not invent facts about a case study. Answers may only use details that appear in the question text or question.data. If the question depends on case or appendix details you have not been given, write a practice question in the same style instead, with its own short context about a fictional business in question.data (give it a new name, never the name of the real case-study business, and rewrite the question text to use the new name), and set ref to 'Practice question (in the style of <original reference>)'. Real, well-known businesses may be used as examples.
- Never name a student.`;

/* ---------- ask the AI ---------- */
const ask=(system,content,max)=>NMark.markJSON({model:MODEL,max_tokens:max||6000,system,messages:[{role:'user',content}]},{timeout:240000});
const SCHEMA=`{"title":"short plain title, e.g. 'Weighing up in a 16-mark conclusion'",
"kind":"written or calculation",
"point":"the teaching point in one or two sentences, corrected if needed",
"correction_note":"if the original point was inaccurate, one sentence saying what was wrong; otherwise empty",
"question":{"text":"the exam question, word for word","ref":"paper and question reference or 'Practice question'","marks":0,"data":"any data or short context the question itself gives, or empty"},
"explain":["2 to 4 short sentences, as the teacher would say them"],
"weak":{"part":"'whole answer', or the part shown, e.g. 'the conclusion'","text":"the answer (or the part of it) that loses marks, written like a real student at that level","mark":"the mark the whole answer would get with this weakness, e.g. 5/9","level":"e.g. Level 2","notes":[{"quote":"exact words copied from weak.text, 3 to 15 words","comment":"what this earns or loses and why, in plain words"}]},
"strong":{"text":"the same part rewritten so it earns full marks for that part, still in a student's voice","notes":[{"quote":"exact words from strong.text","comment":"why this earns the marks"}]},
"what_changed":["3 to 5 short points on how the strong part differs from the weak answer"],
"full_answer":{"text":"a complete answer to the question that would get full marks (paragraphs separated by a blank line)","mark":"e.g. 9/9","notes":[{"quote":"exact words from full_answer.text","comment":"what earns marks here"}]},
"tasks":[{"instruction":"short instruction","material":"a different weak paragraph to improve, or a new question, or empty","lines":10,"answer":"a model answer for the teacher"}],
"checklist":["4 to 6 short things to check before handing in"]}`;
function genSystem(mk){
  return `You are an experienced AQA A-level Business (${SPEC}) teacher and examiner. You are writing a one-lesson resource for your ${YEAR} class on one point that came out of their marked work. It will be printed and used in class.

First check the teaching point is accurate. If it is wrong or muddled, correct it and say so in correction_note. Then write the resource around the corrected point.

${mk?`The question type is a ${mk}-mark question.\nAQA level descriptors for ${mk} marks:\n${LEVELS[mk]||'Use the AQA levels for this mark total.'}\nWhat a full-mark answer to this type should look like on this course:\n${SHAPE[mk]||'Follow AQA expectations for this mark total.'}`:'If the point is about calculations, set kind to "calculation": the weak and strong parts are worked solutions (one with the error, one correct, with formula, working and units) and the full answer is a complete worked solution.'}

${RULES}

The weak answer must show the exact problem in the point, be believable as real student work at the mark you give it, and the mark must fit the level descriptors. The strong part and the full answer must genuinely earn full marks against the descriptors, without sounding like a textbook. Every note quote must be copied exactly from the text it refers to. Give 3 to 6 notes on each text, in the order they appear. Tasks: two or three, each with the number of handwritten lines a student would really need (a paragraph 8 to 12, a 9-mark answer about 22, a conclusion 10), and a model answer.

Reply with ONLY a JSON object in this shape, no other text:
${SCHEMA}`;
}
const STRUCT='Reply with ONLY JSON in this shape. Give a verdict on every area, then list every real problem in issues:\n{"point_accurate":{"ok":true,"note":""},"no_invented_case_facts":{"ok":true,"note":"list any detail used in an answer that is not in the question or question.data"},"weak_shows_the_problem":{"ok":true,"note":""},"weak_mark_fair":{"ok":true,"note":"the mark you would give"},"strong_part_full_marks":{"ok":true,"note":""},"full_answer_full_marks":{"ok":true,"note":"the mark you would give and why"},"follows_course_rules":{"ok":true,"note":""},"notes_accurate_and_quotes_exact":{"ok":true,"note":""},"figures_correct":{"ok":true,"note":"recalculate every figure"},"task_answers_correct":{"ok":true,"note":""},"plain_student_language":{"ok":true,"note":""},"issues":[{"where":"which part","problem":"what is wrong","fix":"how to fix it"}]}';
function checkSystem(mk,step){
  return `You are a senior AQA A-level Business (${SPEC}) examiner checking a printable teaching resource before it goes to a ${YEAR} class. ${step}
${mk?`AQA level descriptors for ${mk} marks:\n${LEVELS[mk]||''}\nCourse rules for a full-mark ${mk}-mark answer:\n${SHAPE[mk]||''}`:''}
${RULES}`;
}
function verdicts(c){
  const out=(c&&Array.isArray(c.issues)?c.issues:[]).slice();
  Object.entries(c||{}).forEach(([k,v])=>{if(v&&typeof v==='object'&&!Array.isArray(v)&&v.ok===false&&!out.some(x=>String(x.where).includes(k.split('_')[0])))out.push({where:k,problem:v.note||k.replace(/_/g,' ')+': not met',fix:''});});
  return out;
}
function localChecks(r,names){
  const out=[];const norm=s=>String(s||'').toLowerCase().replace(/[’']/g,"'").replace(/\s+/g,' ').trim();
  [['weak',r.weak],['strong',r.strong],['full_answer',r.full_answer]].forEach(([k,x])=>{
    if(!x||!x.text){out.push({where:k,problem:'Missing text',fix:'Write it.'});return;}
    (x.notes||[]).forEach((n,i)=>{if(!norm(x.text).includes(norm(n.quote)))out.push({where:`${k}.notes[${i}]`,problem:`The quote "${n.quote}" is not copied exactly from ${k}.text`,fix:'Copy the quote word for word from the text.'});});
  });
  const all=JSON.stringify(r);
  if(/bowman|blake ?mouton|hackman|kaplan|norton|greiner|bartlett|ghoshal|hofstede|mendelow/i.test(all))out.push({where:'anywhere',problem:'Uses a model not on the AQA spec (or calls stakeholder mapping Mendelow)',fix:'Remove or replace it.'});
  if(/\bA\*/.test(all))out.push({where:'anywhere',problem:'Uses "A*"',fix:'Say "top grade".'});
  if(/ultimate|mastery|golden rule|pro tip|exam hack|must-know|guaranteed|unlock|game-chang/i.test(all))out.push({where:'language',problem:'Promotional wording',fix:'Use plain teacher language.'});
  (names||[]).forEach(n=>{if(n.length>2&&new RegExp('\\b'+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(all))out.push({where:'anywhere',problem:`Names a student (${n})`,fix:'Remove student names.'});});
  return out;
}
async function revise(r,issues,mk){
  return ask(genSystem(mk),`Here is the resource:\n${JSON.stringify(r)}\n\nAn examiner found these problems. Fix every one, keep everything else that is right, and return the complete corrected resource in the same JSON shape. The resource is for students: never mention these corrections, the checking, or earlier versions anywhere in it (what_changed is only about the difference between the weak and strong answers):\n${issues.map((x,i)=>`${i+1}. [${x.where}] ${x.problem}${x.fix?' Fix: '+x.fix:''}`).join('\n')}`,8000);
}

/* the full pipeline: write, then check three times */
async function make(job,step){
  const mk=job.marks||null,names=job.names||[],log=[];
  step('Writing the resource');
  let r=await ask(genSystem(mk),`Teaching point (from the class's marked work):\n${job.point}${job.why?'\nEvidence: '+job.why:''}${job.how?'\nSuggested activity: '+job.how:''}

${job.question?`Use this question:\n${job.question.text}\n(${job.question.ref}, ${job.question.marks} marks)${job.question.needs?'\nThis question uses: '+job.question.needs+'. Do not invent those details; if the answer needs them, choose another question below or a practice question that does not.':''}`:''}
${job.options&&job.options.length?`Questions the class answered in this period (you may use one of these instead if it fits the point better):\n${job.options.map(q=>`- ${q.text} (${q.ref}, ${q.marks} marks${q.needs?', uses '+q.needs:''})`).join('\n')}`:''}
${job.comments&&job.comments.length?`What the marker said on their answers (for context only):\n${job.comments.slice(0,25).map(c=>'- '+c).join('\n')}`:''}`,8000);

  /* check 1: examiner audit */
  step('Check 1 of 3: examiner check');
  let iss=localChecks(r,names);
  const c1=await ask(checkSystem(mk,`Check everything: is the teaching point accurate; does the weak answer really show that problem and fit the mark given; do the strong part and the full answer genuinely earn full marks against the descriptors and the course rules; is every note accurate and is its quote copied exactly; are all facts, figures and calculations right (work every calculation out yourself); are the task answers right; is the language plain and right for students. Only report real problems, not matters of taste.
Reply with ONLY JSON in this shape. Give a verdict on every area, then list every real problem in issues:
{"point_accurate":{"ok":true,"note":""},"no_invented_case_facts":{"ok":true,"note":"list any detail used in an answer that is not in the question or question.data"},"weak_shows_the_problem":{"ok":true,"note":""},"weak_mark_fair":{"ok":true,"note":"the mark you would give"},"strong_part_full_marks":{"ok":true,"note":""},"full_answer_full_marks":{"ok":true,"note":"the mark you would give and why"},"follows_course_rules":{"ok":true,"note":""},"notes_accurate_and_quotes_exact":{"ok":true,"note":""},"figures_correct":{"ok":true,"note":"recalculate every figure"},"task_answers_correct":{"ok":true,"note":""},"plain_student_language":{"ok":true,"note":""},"issues":[{"where":"which part","problem":"what is wrong","fix":"how to fix it"}]}`),JSON.stringify(r),3000);
  iss=iss.concat(verdicts(c1));
  log.push({n:1,name:'Examiner check',found:iss.map(x=>x.problem)});
  if(iss.length){step('Fixing what check 1 found');r=await revise(r,iss,mk);}

  /* check 2: blind re-mark (repeated once if it needed fixing) */
  const max=()=>+(r.question&&r.question.marks)||mk||0;
  const blind=async()=>{
    const whole=!r.weak||!r.weak.part||/whole/i.test(r.weak.part);
    const c2=await ask(checkSystem(mk,`Mark independently. You are not told the intended marks.${r.kind==='calculation'?' For a calculation, work the question out yourself first and compare.':''}
Answer A is a complete answer. ${whole?'Answer B is also a complete answer.':`Answer B is only ${r.weak.part} of an answer, so judge what it shows rather than marking it as a whole answer.`}
Reply with ONLY JSON: {"answer_a":{"mark":number,"level":"Level n","why":"what holds it back, if anything"},"answer_b":{"mark":${whole?'number':'null'},"level":"the level this ${whole?'answer':'part'} shows","shows_problem":true or false,"main_problem":"the main reason it loses marks"},"calc_answer":"your own final answer if this is a calculation, else empty"}`),
      `Question (${max()} marks): ${r.question&&r.question.text}\n${r.question&&r.question.data?'Information given: '+r.question.data+'\n':''}\nThe problem answer B is meant to show: ${r.point}\n\nAnswer A:\n${r.full_answer&&r.full_answer.text}\n\nAnswer B:\n${r.weak&&r.weak.text}`,1500).catch(()=>null);
    const found=[];if(!c2||!c2.answer_a)return {found,detail:'Could not complete'};
    const M=max(),fm=+c2.answer_a.mark;
    if(M&&fm<M-(M>=16?1:0))found.push({where:'full_answer',problem:`A second examiner marking blind gave the full-mark answer ${fm}/${M}: ${c2.answer_a.why||''}`,fix:'Improve it so it clearly earns full marks.'});
    if(c2.answer_b&&c2.answer_b.shows_problem===false)found.push({where:'weak',problem:`The blind examiner did not see the intended problem in the weak answer. They saw: ${c2.answer_b.main_problem||''}`,fix:'Make the weak answer clearly show the problem in the point.'});
    if(whole&&c2.answer_b&&c2.answer_b.mark!=null){const wm=parseFloat(String(r.weak.mark).split('/')[0]),bm=+c2.answer_b.mark;
      if(!isNaN(wm)&&!isNaN(bm)&&M&&Math.abs(wm-bm)>Math.max(1,M*0.12))found.push({where:'weak.mark',problem:`The blind examiner gave the weak answer ${bm}/${M}, not ${r.weak.mark}. Their reason: ${c2.answer_b.main_problem||''}`,fix:'Change the mark to fit, or adjust the weak answer so it fits the mark and still shows the problem.'});}
    if(r.kind==='calculation'&&c2.calc_answer)found.push(...[]);
    return {found,detail:`Full-mark answer: ${c2.answer_a.mark}/${M}. ${whole&&c2.answer_b&&c2.answer_b.mark!=null?`Weak answer: ${c2.answer_b.mark}/${M} (intended ${r.weak.mark}).`:`Weak part shows the problem: ${c2.answer_b&&c2.answer_b.shows_problem?'yes':'no'}.`}`};
  };
  step('Check 2 of 3: blind re-mark by a second examiner');
  let b1=await blind(),warn=[];
  if(b1.found.length){step('Fixing what check 2 found');r=await revise(r,b1.found,mk);step('Check 2 again: blind re-mark of the fixed version');const b2=await blind();
    b1={found:b1.found,detail:b1.detail+' After fixing: '+b2.detail};if(b2.found.length){step('Fixing again');r=await revise(r,b2.found,mk);warn.push(...b2.found.map(x=>x.problem));}}
  log.push({n:2,name:'Blind re-mark',found:b1.found.map(x=>x.problem),detail:b1.detail});

  /* check 3: final proofread */
  step('Check 3 of 3: final proofread');
  let iss3=localChecks(r,names);
  const c3=await ask(checkSystem(mk,`This is the final check before printing. Read it as a careful head of department would. Check facts against the AQA ${SPEC} specification, recalculate every figure, check every note quote is copied exactly and every note is accurate, check the full-mark answer follows the course rules for this question type, and check the wording is plain and suitable for students. Only report real problems.
Reply with ONLY JSON in this shape. Give a verdict on every area, then list every real problem in issues:
{"point_accurate":{"ok":true,"note":""},"no_invented_case_facts":{"ok":true,"note":"list any detail used in an answer that is not in the question or question.data"},"weak_shows_the_problem":{"ok":true,"note":""},"weak_mark_fair":{"ok":true,"note":"the mark you would give"},"strong_part_full_marks":{"ok":true,"note":""},"full_answer_full_marks":{"ok":true,"note":"the mark you would give and why"},"follows_course_rules":{"ok":true,"note":""},"notes_accurate_and_quotes_exact":{"ok":true,"note":""},"figures_correct":{"ok":true,"note":"recalculate every figure"},"task_answers_correct":{"ok":true,"note":""},"plain_student_language":{"ok":true,"note":""},"issues":[{"where":"which part","problem":"what is wrong","fix":"how to fix it"}]}`),JSON.stringify(r),3000);
  iss3=iss3.concat(verdicts(c3));
  if(iss3.length){step('Fixing what check 3 found');r=await revise(r,iss3,mk);
    step('Check 3 again: proofread of the fixed version');
    const c4=await ask(checkSystem(mk,`Final check of a resource that has just been corrected. Check facts, figures, exact quotes, the course rules for this question type, invented case details and wording. Only report real problems.\n${STRUCT}`),JSON.stringify(r),3000).catch(()=>null);
    const left=localChecks(r,names).concat(c4?verdicts(c4):[]);
    if(left.length){step('Fixing the last points');r=await revise(r,left,mk);const last=localChecks(r,names);warn.push(...last.map(x=>x.problem));}
  }
  log.push({n:3,name:'Final proofread',found:iss3.map(x=>x.problem)});
  r._warn=warn;
  r._log=log;r._made=Date.now();r._point=job.point;
  return r;
}

/* ---------- Word worksheet ---------- */
function loadScript(src){return new Promise((ok,no)=>{if(document.querySelector(`script[src="${src}"]`)){const t=setInterval(()=>{if(src.includes('docx')?window.docx:window.PptxGenJS){clearInterval(t);ok();}},50);return;}const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(new Error('Could not load '+src));document.head.appendChild(s);});}
/* put notes in reading order and number them 1, 2, 3 ... */
function ordered(x){
  if(!x||!x.text)return x;const low=String(x.text).toLowerCase().replace(/[’']/g,"'").replace(/\s+/g,' ');
  const ns=(x.notes||[]).map(n=>({n,at:low.indexOf(String(n.quote||'').toLowerCase().replace(/[’']/g,"'").replace(/\s+/g,' ').trim())}));
  ns.sort((a,b)=>(a.at<0?1e9:a.at)-(b.at<0?1e9:b.at));
  return Object.assign({},x,{notes:ns.map((o,i)=>Object.assign({},o.n,{num:i+1}))});
}
function tidy(r){return Object.assign({},r,{weak:ordered(r.weak),strong:ordered(r.strong),full_answer:ordered(r.full_answer)});}
function pieces(text,notes){
  /* split text into runs, marking each note's quote with its number */
  const t=String(text||''),low=t.toLowerCase().replace(/[’']/g,"'"),hits=[];
  (notes||[]).forEach((n,i)=>{const q=String(n.quote||'').toLowerCase().replace(/[’']/g,"'").replace(/\s+/g,' ').trim();if(!q)return;
    const at=low.replace(/\s+/g,' ').indexOf(q);if(at<0)return;
    /* map back to the original index (whitespace collapsed) */
    let k=0,j=0;for(;j<t.length&&k<at;j++){if(!(/\s/.test(t[j])&&/\s/.test(t[j+1]||'')))k++;}
    let e=j,m=0;for(;e<t.length&&m<q.length;e++){if(!(/\s/.test(t[e])&&/\s/.test(t[e+1]||'')))m++;}
    if(!hits.some(h=>j<h.e&&e>h.s))hits.push({s:j,e,n:n.num||i+1});});
  hits.sort((a,b)=>a.s-b.s);
  const out=[];let p=0;hits.forEach(h=>{if(h.s>p)out.push({t:t.slice(p,h.s)});out.push({t:t.slice(h.s,h.e),n:h.n});p=h.e;});if(p<t.length)out.push({t:t.slice(p)});
  return out;
}
async function buildDocx(r){
  r=tidy(r);
  await loadScript('vendor/docx.umd.js');
  const D=window.docx,{Document,Packer,Paragraph,TextRun,HeadingLevel,AlignmentType,BorderStyle,Table,TableRow,TableCell,WidthType,ShadingType,PageBreak,Footer,PageNumber}=D;
  const F='Calibri',ink='1A1A1A',navy='0D1B34',grey='5A6270';
  const P=(text,o)=>new Paragraph(Object.assign({spacing:{after:120,line:300},children:[new TextRun({text:String(text||''),font:F,size:22,color:ink})]},o||{}));
  const H=(text,lvl)=>new Paragraph({spacing:{before:lvl===1?0:280,after:120},keepNext:true,children:[new TextRun({text,font:F,bold:true,size:lvl===1?36:26,color:navy})]});
  const NB={style:BorderStyle.NONE,size:0,color:'FFFFFF'};
  const lines=n=>[new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:{top:NB,bottom:NB,left:NB,right:NB,insideHorizontal:NB,insideVertical:NB},
    rows:Array.from({length:n},()=>new TableRow({height:{value:480,rule:'exact'},cantSplit:true,children:[new TableCell({borders:{top:NB,left:NB,right:NB,bottom:{style:BorderStyle.SINGLE,size:4,color:'A9AEB6'}},children:[new Paragraph({children:[]})]})]}))})];
  const marked=(text,notes,fill)=>String(text||'').split(/\n\s*\n/).map(par=>new Paragraph({spacing:{after:140,line:320},children:pieces(par,notes).flatMap(x=>x.n?[new TextRun({text:x.t,font:F,size:22,color:ink,shading:{type:ShadingType.CLEAR,color:'auto',fill}}),new TextRun({text:String(x.n),font:F,size:16,bold:true,superScript:true,color:navy})]:[new TextRun({text:x.t,font:F,size:22,color:ink})])}));
  const notes=ns=>(ns||[]).map((n,i)=>new Paragraph({spacing:{after:80,line:280},indent:{left:360,hanging:360},children:[new TextRun({text:`${n.num||i+1}.  `,font:F,bold:true,size:20,color:navy}),new TextRun({text:n.comment,font:F,size:20,color:grey})]}));
  const box=(kids,fill)=>new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[new TableRow({cantSplit:false,children:[new TableCell({shading:{type:ShadingType.CLEAR,color:'auto',fill:fill||'F3F4F6'},margins:{top:160,bottom:160,left:200,right:200},borders:{top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.NONE},left:{style:BorderStyle.SINGLE,size:18,color:'0D1B34'},right:{style:BorderStyle.NONE}},children:kids})]})]});
  const bullets=a=>(a||[]).map(x=>new Paragraph({bullet:{level:0},spacing:{after:80,line:300},children:[new TextRun({text:x,font:F,size:22,color:ink})]}));
  const q=r.question||{},kids=[];
  kids.push(H(r.title,1));
  kids.push(new Paragraph({spacing:{after:200},children:[new TextRun({text:`${YEAR} Business`,font:F,size:20,color:grey}),new TextRun({text:'      Name ______________________________',font:F,size:20,color:grey})]}));
  kids.push(...(r.explain||[]).map(x=>P(x)));
  kids.push(H('The question'));
  kids.push(box([P(q.text,{spacing:{after:80,line:300}}),...(q.data?[P(q.data,{spacing:{after:80}})]:[]),new Paragraph({children:[new TextRun({text:`${q.ref||''}${q.marks?'   ['+q.marks+' marks]':''}`,font:F,size:18,color:grey})]})]));
  kids.push(H(`An answer that loses marks${r.weak&&r.weak.mark?' ('+r.weak.mark+')':''}`));
  kids.push(...marked(r.weak&&r.weak.text,r.weak&&r.weak.notes,'FCE8C8'));
  kids.push(P('Where the marks go:',{spacing:{before:80,after:60},children:[new TextRun({text:'Where the marks go',font:F,bold:true,size:20,color:navy})]}));
  kids.push(...notes(r.weak&&r.weak.notes));
  kids.push(H('The same part, written for full marks'));
  kids.push(...marked(r.strong&&r.strong.text,r.strong&&r.strong.notes,'D9EFE3'));
  kids.push(new Paragraph({spacing:{before:80,after:60},children:[new TextRun({text:'Why this earns the marks',font:F,bold:true,size:20,color:navy})]}));
  kids.push(...notes(r.strong&&r.strong.notes));
  kids.push(H('What changed'));kids.push(...bullets(r.what_changed));
  kids.push(new Paragraph({children:[new PageBreak()]}));
  kids.push(H(`A full-mark answer${r.full_answer&&r.full_answer.mark?' ('+r.full_answer.mark+')':''}`,1));
  kids.push(P(q.text,{spacing:{after:200},children:[new TextRun({text:q.text,font:F,italics:true,size:20,color:grey})]}));
  kids.push(...marked(r.full_answer&&r.full_answer.text,r.full_answer&&r.full_answer.notes,'D9EFE3'));
  kids.push(new Paragraph({spacing:{before:120,after:60},children:[new TextRun({text:'What earns the marks',font:F,bold:true,size:20,color:navy})]}));
  kids.push(...notes(r.full_answer&&r.full_answer.notes));
  (r.tasks||[]).forEach((t,i)=>{
    kids.push(new Paragraph({children:[new PageBreak()]}));
    kids.push(H(i===0?'Now you try':'Task '+(i+1),1));
    kids.push(new Paragraph({spacing:{after:140},children:[new TextRun({text:`${i+1}.  ${t.instruction}`,font:F,bold:true,size:22,color:ink})]}));
    if(t.material)kids.push(box(String(t.material).split(/\n\s*\n/).map(x=>P(x,{spacing:{after:80,line:300}}))));
    kids.push(new Paragraph({spacing:{after:120},children:[]}));
    kids.push(...lines(Math.max(8,Math.min(t.material?20:28,(+t.lines||10)+2))));
  });
  if((r.checklist||[]).length){kids.push(H('Before you hand it in'));kids.push(...(r.checklist||[]).map((x,i,a)=>new Paragraph({spacing:{after:100},keepNext:i<a.length-1,children:[new TextRun({text:'☐  ',font:'Segoe UI Symbol',size:22}),new TextRun({text:x,font:F,size:22,color:ink})]})));}
  kids.push(new Paragraph({children:[new PageBreak()]}));
  kids.push(H('Teacher copy: answers to the tasks',1));
  (r.tasks||[]).forEach((t,i)=>{kids.push(new Paragraph({spacing:{before:160,after:80},keepNext:true,children:[new TextRun({text:`${i+1}.  ${t.instruction}`,font:F,bold:true,size:22,color:navy})]}));kids.push(...String(t.answer||'').split(/\n\s*\n/).map(x=>P(x)));});
  if(r.correction_note)kids.push(P('Note: '+r.correction_note,{spacing:{before:240},children:[new TextRun({text:'Note on the teaching point: '+r.correction_note,font:F,size:18,color:grey,italics:true})]}));
  const doc=new Document({creator:'Nishkam School West London',title:r.title,sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1000,bottom:1000,left:1000,right:1000}}},
    footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({children:[PageNumber.CURRENT],font:F,size:16,color:grey})]})]})},children:kids}]});
  return Packer.toBlob(doc);
}

/* ---------- PowerPoint ---------- */
async function buildPptx(r){
  r=tidy(r);
  await loadScript('vendor/pptxgen.bundle.js');
  const p=new window.PptxGenJS();p.layout='LAYOUT_WIDE';p.title=r.title;
  const NAVY='0D1B34',GOLD='EEB834',INK='1A1A1A',GREY='5A6270',F='Calibri';
  const q=r.question||{};
  const base=(title)=>{const s=p.addSlide();s.background={color:'FFFFFF'};s.addShape(p.ShapeType.rect,{x:0,y:0,w:13.33,h:0.12,fill:{color:NAVY}});
    if(title)s.addText(title,{x:0.6,y:0.35,w:12.1,h:0.7,fontFace:F,fontSize:28,bold:true,color:NAVY});return s;};
  const fit=(len,big,small)=>len>1100?small:len>700?Math.round((big+small)/2):big;
  const split=(t,max)=>{const out=[];let cur='';String(t||'').split(/\n\s*\n|(?<=[.?!])\s+(?=[A-Z])/).forEach(x=>{if((cur+' '+x).length>max&&cur){out.push(cur.trim());cur='';}cur+=(cur?' ':'')+x;});if(cur.trim())out.push(cur.trim());return out;};
  const runs=(text,notes,fill)=>{const out=[];String(text||'').split(/\n\s*\n/).forEach((par,pi,arr)=>{pieces(par,notes).forEach(x=>{
      if(x.n){out.push({text:x.t,options:{highlight:fill}});out.push({text:String(x.n),options:{superscript:true,bold:true,color:NAVY}});}else out.push({text:x.t});});
      if(pi<arr.length-1)out.push({text:'',options:{breakLine:true}}),out.push({text:'',options:{breakLine:true}});});return out;};
  const noteList=ns=>(ns||[]).map((n,i)=>({text:`${n.num||i+1}. ${n.comment}`,options:{breakLine:true,paraSpaceAfter:6}}));
  /* 1 title */
  let s=p.addSlide();s.background={color:NAVY};
  s.addText(r.title,{x:0.8,y:2.3,w:11.7,h:1.6,fontFace:F,fontSize:40,bold:true,color:'FFFFFF'});
  s.addShape(p.ShapeType.rect,{x:0.8,y:4.0,w:1.2,h:0.08,fill:{color:GOLD}});
  s.addText(`${YEAR} Business`,{x:0.8,y:4.3,w:8,h:0.5,fontFace:F,fontSize:18,color:'C9D1DE'});
  /* 2 the point */
  s=base('What we keep seeing');
  s.addText([{text:r.point,options:{bold:true,breakLine:true,paraSpaceAfter:14}},...(r.explain||[]).map(x=>({text:x,options:{bullet:true,breakLine:true,paraSpaceAfter:8}}))],{x:0.6,y:1.3,w:12.1,h:5.6,fontFace:F,fontSize:22,color:INK,valign:'top'});
  /* 3 question */
  s=base('The question');
  s.addShape(p.ShapeType.rect,{x:0.6,y:1.5,w:0.1,h:3.2,fill:{color:NAVY}});
  s.addText([{text:q.text,options:{breakLine:true,paraSpaceAfter:12}},...(q.data?[{text:q.data,options:{fontSize:16,color:GREY,breakLine:true,paraSpaceAfter:12}}]:[]),{text:`${q.ref||''}${q.marks?'   ['+q.marks+' marks]':''}`,options:{fontSize:14,color:GREY}}],{x:0.95,y:1.5,w:11.6,h:4.8,fontFace:F,fontSize:fit((q.text||'').length,28,20),color:INK,valign:'top'});
  /* 4 weak, 5 strong */
  const notesSlide=(title,ns)=>{const sl=base(title);sl.addText(noteList(ns).map(n=>Object.assign(n,{options:Object.assign({},n.options,{paraSpaceAfter:10})})),{x:0.6,y:1.3,w:12.1,h:5.7,fontFace:F,fontSize:(ns||[]).reduce((a,n)=>a+n.comment.length,0)>900?16:19,color:INK,valign:'top'});};
  const pair=(title,x,fill,notesTitle)=>{const len=(x.text||'').length;
    if(len>650){const sl=base(title);sl.addText(runs(x.text,x.notes,fill),{x:0.6,y:1.25,w:12.1,h:5.9,fontFace:F,fontSize:fit(len,22,18),color:INK,valign:'top'});notesSlide(notesTitle,x.notes);return;}
    const sl=base(title);
    sl.addText(runs(x.text,x.notes,fill),{x:0.6,y:1.25,w:7.6,h:5.9,fontFace:F,fontSize:fit(len,22,19),color:INK,valign:'top',paraSpaceAfter:6});
    sl.addShape(p.ShapeType.rect,{x:8.5,y:1.25,w:4.25,h:5.9,fill:{color:'F3F4F6'}});
    sl.addText([{text:notesTitle,options:{bold:true,color:NAVY,breakLine:true,paraSpaceAfter:8}},...noteList(x.notes)],{x:8.65,y:1.35,w:4.0,h:5.7,fontFace:F,fontSize:(x.notes||[]).reduce((a,n)=>a+n.comment.length,0)>650?13:15,color:INK,valign:'top'});};
  pair(`An answer that loses marks${r.weak.mark?' ('+r.weak.mark+')':''}`,r.weak||{},'FCE8C8','Where the marks go');
  pair('The same part, written for full marks',r.strong||{},'D9EFE3','Why this earns the marks');
  /* 6 what changed */
  s=base('What changed');
  s.addText((r.what_changed||[]).map(x=>({text:x,options:{bullet:true,breakLine:true,paraSpaceAfter:10}})),{x:0.6,y:1.3,w:12.1,h:5.6,fontFace:F,fontSize:22,color:INK,valign:'top'});
  /* 7+ full answer, split by paragraphs if long */
  const fa=r.full_answer||{};const chunks=split(fa.text,1000);
  chunks.forEach((txt,ci)=>{const ns=(fa.notes||[]).filter(n=>txt.toLowerCase().replace(/\s+/g,' ').includes(String(n.quote||'').toLowerCase().replace(/\s+/g,' ').trim()));
    const sl=base(`A full-mark answer${fa.mark?' ('+fa.mark+')':''}${chunks.length>1?` (${ci+1} of ${chunks.length})`:''}`);
    sl.addText(runs(txt,ns,'D9EFE3'),{x:0.6,y:1.25,w:12.1,h:5.9,fontFace:F,fontSize:fit(txt.length,22,18),color:INK,valign:'top'});});
  if((fa.notes||[]).length)notesSlide('What earns the marks in the full answer',fa.notes);
  /* tasks + answers */
  (r.tasks||[]).forEach((t,i)=>{
    const sl=base(i===0?'Your turn':'Task '+(i+1));
    sl.addText([{text:t.instruction,options:{bold:true,breakLine:true,paraSpaceAfter:12}},...(t.material?[{text:t.material,options:{fontSize:fit(String(t.material).length,22,18),color:INK}}]:[])],{x:0.6,y:1.3,w:12.1,h:5.6,fontFace:F,fontSize:22,color:INK,valign:'top'});
    const parts=split(t.answer,950);
    parts.forEach((a,k)=>{const al=base('Check your answer'+((r.tasks||[]).length>1?' (task '+(i+1)+')':'')+(parts.length>1?` (${k+1} of ${parts.length})`:''));
      al.addText(a,{x:0.6,y:1.3,w:12.1,h:5.7,fontFace:F,fontSize:fit(a.length,22,18),color:INK,valign:'top'});});
  });
  if((r.checklist||[]).length){s=base('Before you hand it in');s.addText(r.checklist.map(x=>({text:x,options:{bullet:true,breakLine:true,paraSpaceAfter:10}})),{x:0.6,y:1.3,w:12.1,h:5.6,fontFace:F,fontSize:22,color:INK,valign:'top'});}
  return p.write({outputType:'blob'});
}
function save(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);}
const fname=(r,ext)=>String(r.title||'Resource').replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,' ').slice(0,60)+'.'+ext;

/* ---------- panel in the report ---------- */
const css=`.rs-panel{margin-top:12px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px}
.rs-panel select{width:100%;margin:6px 0 10px}
.rs-steps{list-style:none;padding:0;margin:10px 0 0;display:grid;gap:6px;font-size:.88rem}
.rs-steps li{display:flex;gap:8px;align-items:center;color:var(--muted)}
.rs-steps li.now{color:var(--fg);font-weight:600}
.rs-steps li.done::before{content:"✓";color:var(--ok);font-weight:700}
.rs-steps li.now::before{content:"";width:12px;height:12px;border-radius:50%;border:2px solid var(--line);border-top-color:var(--fg);animation:rpspin .8s linear infinite}
.rs-log{font-size:.84rem;color:var(--muted);margin-top:10px;line-height:1.55}
.rs-log b{color:var(--fg)}
.rs-prev{margin-top:12px;border-top:1px solid var(--line);padding-top:10px}
.rs-prev summary{cursor:pointer;font-weight:600}
.rs-prev .tx{white-space:pre-wrap;background:var(--bg2);border-radius:8px;padding:10px 12px;font-size:.88rem;line-height:1.6;margin:6px 0}
.rs-btn{margin-top:10px}`;
let cssDone=false;
const store={get:k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
const keyFor=p=>'nk_res:'+SPEC+':'+String(p).slice(0,120);

function open(host,job){
  if(!cssDone){const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);cssDone=true;}
  let panel=host.querySelector('.rs-panel');if(panel){panel.remove();return;}
  panel=document.createElement('div');panel.className='rs-panel';host.appendChild(panel);
  const saved=store.get(keyFor(job.point));
  const opts=job.options||[];
  panel.innerHTML=`<label class="muted" style="font-size:.82rem">Question to build it around</label>
    <select class="rs-q"><option value="">Let it choose the best fit${job.marks?' ('+job.marks+'-mark)':''}</option>${opts.map((q,i)=>`<option value="${i}">${esc(q.ref)}: ${esc(String(q.text).slice(0,110))}${q.text.length>110?'…':''}</option>`).join('')}</select>
    <div class="rp-btnrow"><button class="btn rs-go">${saved?'Make it again':'Make the worksheet and slides'}</button>${saved?'<button class="btn ghost rs-dw">Download Word</button><button class="btn ghost rs-dp">Download PowerPoint</button>':''}<span class="muted" style="font-size:.84rem">Takes 2 to 4 minutes: it is written, then checked three times.</span></div>
    <ul class="rs-steps"></ul><div class="rs-out">${saved?outHtml(saved):''}</div>`;
  const wire=r=>{const dw=$('.rs-dw',panel),dp=$('.rs-dp',panel);
    if(dw)dw.onclick=async()=>{dw.disabled=true;dw.textContent='Making…';try{save(await buildDocx(r),fname(r,'docx'));}catch(e){alert(e.message);}dw.disabled=false;dw.textContent='Download Word';};
    if(dp)dp.onclick=async()=>{dp.disabled=true;dp.textContent='Making…';try{save(await buildPptx(r),fname(r,'pptx'));}catch(e){alert(e.message);}dp.disabled=false;dp.textContent='Download PowerPoint';};};
  if(saved)wire(saved);
  $('.rs-go',panel).onclick=async()=>{
    const go=$('.rs-go',panel);go.disabled=true;
    const sel=$('.rs-q',panel).value;const j=Object.assign({},job,{question:sel!==''?opts[+sel]:null});
    if(j.question&&j.question.marks)j.marks=+j.question.marks;
    const ul=$('.rs-steps',panel);ul.innerHTML='';$('.rs-out',panel).innerHTML='';
    const step=t=>{$$('li',ul).forEach(li=>{li.className='done';});const li=document.createElement('li');li.className='now';li.textContent=t;ul.appendChild(li);};
    try{
      const r=await make(j,step);step('Making the files');
      store.set(keyFor(job.point),r);
      $$('li',ul).forEach(li=>{li.className='done';});
      $('.rp-btnrow',panel).innerHTML=`<button class="btn ghost rs-go2">Make it again</button><button class="btn rs-dw">Download Word</button><button class="btn rs-dp">Download PowerPoint</button>`;
      $('.rs-out',panel).innerHTML=outHtml(r);wire(r);
      $('.rs-go2',panel).onclick=()=>{panel.remove();open(host,job);$('.rs-go',host).click();};
    }catch(e){$$('li.now',ul).forEach(li=>{li.className='';li.textContent+=' — stopped';});$('.rs-out',panel).innerHTML=`<p class="err">${esc(e.message)}</p>`;go.disabled=false;}
  };
}
function outHtml(r){
  const log=(r._log||[]).map(l=>`<div><b>Check ${l.n}, ${esc(l.name.toLowerCase())}:</b> ${l.found.length?`${l.found.length} thing${l.found.length>1?'s':''} fixed (${esc(l.found.slice(0,3).join('; ').slice(0,300))}${l.found.length>3?'…':''})`:'nothing to fix'}${l.detail?' '+esc(l.detail):''}</div>`).join('');
  return `<div class="rs-log">${(r._warn||[]).length?`<div style="color:var(--end)"><b>Check this yourself before printing:</b> ${esc(r._warn.join('; '))}</div>`:''}${r.correction_note?`<div><b>Teaching point corrected:</b> ${esc(r.correction_note)}</div>`:''}${log}</div>
  <details class="rs-prev"><summary>Read it before you print: ${esc(r.title)}</summary>
    <p style="margin:8px 0 4px"><b>Question:</b> ${esc(r.question&&r.question.text)} <span class="muted">(${esc(r.question&&r.question.ref)})</span></p>
    <p style="margin:10px 0 2px"><b>An answer that loses marks (${esc(r.weak&&r.weak.mark)})</b></p><div class="tx">${esc(r.weak&&r.weak.text)}</div>
    <ol style="margin:0 0 8px;padding-left:20px;font-size:.86rem">${((r.weak&&r.weak.notes)||[]).map(n=>`<li><i>"${esc(n.quote)}"</i>: ${esc(n.comment)}</li>`).join('')}</ol>
    <p style="margin:10px 0 2px"><b>Written for full marks</b></p><div class="tx">${esc(r.strong&&r.strong.text)}</div>
    <p style="margin:10px 0 2px"><b>Full-mark answer (${esc(r.full_answer&&r.full_answer.mark)})</b></p><div class="tx">${esc(r.full_answer&&r.full_answer.text)}</div>
  </details>`;
}

window.Resources={open,make,buildDocx,buildPptx};
})();
