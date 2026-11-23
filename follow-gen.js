/* =====================================================================
   Building a follow-up set for one gap. Used by the automatic follow-ups
   on the student's side (follow-auto.js) and by the "Send now" button
   on the teacher tracker.
   - calculation topics: the hand-checked refresher deck first, then
     2 multiple-choice and 2 calculation questions
   - other topics: the knowledge refresher deck if there is one for the
     topic, otherwise a short recap, then 3 multiple-choice and
     1 short-answer question
   Every question is then checked by a second, independent examiner pass
   (WorkGen.verify). Anything it disagrees with is dropped; if fewer than
   three questions survive, nothing is sent.
   Needs taxonomy.js, analysis.js, workgen.js (and refreshers.js for decks).
   No student data is kept in this file.
   ===================================================================== */
(function(){
"use strict";
/* the hand-checked refresher deck that covers a topic (decks list their topics) */
function deckFor(topic){const R=window.REFRESH;if(!R||!R.DECKS)return '';return Object.keys(R.DECKS).find(k=>(R.DECKS[k].topics||[]).includes(topic))||'';}
const isCalcDeck=k=>!!k&&window.REFRESH.DECKS[k].kind!=='know';
/* what has gone wrong on this topic, in the student's own feedback */
function about(marks,topic){
  const A=window.Analysis,lines=[];
  (marks||[]).forEach(m=>{String(m.improve||'').split(/\s\/\s|;|\n|(?<=\.)\s+(?=[A-Z])/).forEach(sg=>{sg=sg.trim();if(sg.length>15&&A.topicsIn(sg,2).includes(topic))lines.push(sg);});});
  return [...new Set(lines)].slice(0,4).join('\n');
}
/* g: a gap from Analysis (id, title, score, kinds); marks: the student's marked answers */
async function build(g,marks){
  const A=window.Analysis,W=window.WorkGen;
  const deck=deckFor(g.id),ab=about(marks,g.id),src=A.kindsText(g)||'their work';
  let spec=await W.generate({topics:[g.id],counts:isCalcDeck(deck)?{mcq:2,calc:2}:{mcq:3,short:1},title:`Follow-up: ${g.title}`,
    about:`About ${Math.round(g.score*100)}% right on this topic so far, from ${src}.${ab?`\nFrom their feedback:\n${ab}`:''}`,
    note:'This is a short follow-up on one topic the student keeps losing marks on. Target the specific misunderstanding. Keep each question short.'});
  if(!deck)spec.recap=await W.recap(g.id,ab).catch(()=>'');
  spec=await W.verify(spec);
  if(!spec.items||spec.items.length<3)throw new Error('Not enough questions passed the accuracy check. Try again.');
  spec.title=`Follow-up: ${g.title}`;spec.topic=g.id;if(deck)spec.deck=deck;
  return {topic:g.id,kinds:Object.keys(g.kinds||{}),before:g.score,deck,spec,why:`Shows up in ${src} (about ${Math.round(g.score*100)}% right).`};
}
window.FollowGen={build,deckFor,about};
})();
