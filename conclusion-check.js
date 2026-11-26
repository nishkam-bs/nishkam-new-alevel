/* =====================================================================
   Conclusion Lab: teacher check of the marker.
   Open conclusion-lab.html?check=1 to run a set of conclusions written
   at known levels through the marker and compare the level it gives
   with the level expected. Nothing is saved or sent to the tracker.
   Locked homework questions can be checked here before they open.
   ===================================================================== */
(function(){
"use strict";
if(new URLSearchParams(location.search).get('check')!=='1')return;

/* [question id, expected lowest level, expected highest level, conclusion] */
const SET=[
/* 9-mark Assess (3 levels) */
['S1-01.3',3,3,`Overall more spending on influencers should raise Gymshark's profits, but only if each extra pound brings in more than a pound of profit. Influencers built the brand and TikTok reaches the 18-24s who are its main buyers, so the money goes to the right people. The problem is that Nike and Adidas want the same influencers so fees go up, and with 18 million followers already a lot of people know the brand, so each post brings fewer new customers. So it mainly depends on the return Gymshark gets on the extra spending, and on choosing influencers who will not cause a scandal. If it tracks this, profits should rise.`],
['S1-01.3',2,2,`In conclusion, influencers can increase profit because they reach young people on TikTok and make the brand different from Nike. However they can cost a lot and there is a risk of a scandal. Overall I think Gymshark should spend more on influencers because it will lead to higher profits.`],
['S1-01.3',1,1,`I think Gymshark should spend more on influencers because influencers are really popular with young people and everyone uses social media now.`],
['hw03-9b',1,1,`Overall Bolt is a good idea but Brightwave should also think about opening its own toy shops because this would let it sell directly to customers and make more profit, and it could also sell abroad in Europe where there are lots of customers.`],
['hw02-9b',1,1,`There are good points and bad points about brand awareness. It could help Volta sell more bikes but it might not lead to sales. Both sides are important so it depends on the situation.`],
['A-2022-01.5',3,3,`Now is a good time to launch a tea brand, but only if it is a health tea. Black tea is shrinking, down about 29% since 2012, and the big four have around 70% of sales, so a new black tea would be fighting over a smaller market. Health teas are growing, with Pukka up 15.4%, and a PED of -0.5 means a new brand could charge a premium. So it depends on which segment it targets, and whether it has the money to get into supermarkets.`],
/* 9-mark Assess with a calculation (3 levels) */
['hw02-9a',3,3,`Fernhill should raise the price, but it shouldn't expect revenue to go up by the full £367,200. On its own the PED of -0.6 means a 10% rise only loses 6% of sales, but incomes are falling 2% and with a YED of +1.6 that takes another 3.2% off, so revenue would stay at about £10.8m. That is still worth doing, because it is selling around 216,000 fewer packs for the same money, so costs fall while ingredient prices are rising. It depends on whether the PED estimate is right when people have less to spend.`],
['hw02-9a',2,2,`Overall Fernhill should raise the price to £4.95. Revenue goes up by £367,200 because the PED is -0.6 which is inelastic. But incomes are falling and the YED is +1.6 so some people might stop buying it. I think they should still do it.`],
['hw02-9a',1,2,`Fernhill should not raise the price because people will just buy cheaper meals instead and it will lose customers to other businesses, and it is unfair on customers when prices are already high.`],
['hw03-9a',2,3,`Brightwave should stop selling Word Wizard as sales fell by 27.3% and it is a dog in the Boston Matrix with only 2% market share. Although it still makes £0.4m, the resources could be used better on Glow Track which is a star.`],
/* 15-mark Evaluate: two options (5 levels) */
['hw03-15a',4,5,`I recommend price skimming. Penetration pricing brings in about £400,000 more revenue, but each robot costs £31, so skimming makes around £406,000 more contribution and gets back 77% of the £1.4m development cost in year one. As rivals are not expected for 18 months, Brightwave can charge a high price to parents who want the newest toy and then cut the price when copies arrive. The risk is that penetration would give it twice as many customers before rivals come, so it depends on how quickly rivals really launch. If it is 18 months, skimming gives the most profit now and still lets Brightwave lower the price later.`],
['hw03-15a',2,3,`Overall Brightwave should use price skimming. Skimming has revenue of £1,759,780 and penetration has revenue of £2,159,520. Penetration gets more customers but skimming has a higher price. I recommend skimming because it is a new product.`],
['hw03-15a',1,2,`Both options have advantages and disadvantages. Skimming gives a high price and penetration gives more sales. Brightwave should think carefully about it and maybe do both at different times.`],
['hw01-15a',4,5,`I recommend that Northbank keeps its Fairtrade beans and holds the dividend. The £6m saving is certain, but Northbank's whole brand is "Good coffee, fairly bought" and 34% of customers say ethical sourcing matters, so if even a few of them go to Costa or Starbucks, which is easy to do, the lost sales across 640 shops could be bigger than the saving and the damage would last. It depends on how many of those customers would really switch. Holding the dividend won't raise profit by itself, so the £10m kept has to be used on things like staff pay and efficiency. The big shareholders won't like it, but protecting the brand is better for profit in the long run.`],
['hw01-15a',3,3,`Overall I think Northbank should keep the Fairtrade beans. Switching would save £6 million, which would increase profit and keep the big shareholders happy. But keeping Fairtrade protects the brand as 34% of customers care about ethical sourcing. So I recommend keeping the Fairtrade beans and holding the dividend.`],
/* 15-mark Evaluate: two ways (5 levels) */
['hw04-15b',4,5,`I recommend a new series of figures. The market is worth £30 million and growing at 15%, so children are buying collectables, but Pocket Pals has only 3% while the biggest rival has 30%. That suggests children prefer what rivals sell, so the problem is the product more than awareness. More adverts would just push figures children are not choosing, whereas new and limited edition figures give them a reason to collect Pocket Pals. It depends on why sales are low, which Brightwave should check with some research, and on money, as Bolt is launching too. If awareness turns out to be the problem, promotion would be cheaper, but on this evidence new figures are the better choice.`],
['hw04-15b',1,2,`Brightwave should do both because promotion and new figures will both increase sales of Pocket Pals and the market is big.`],
['hw02-15b',3,4,`I think Fernhill should make more own-label meals. Own-label has a YED of -0.4 so demand goes up when incomes fall, but Fernhill Kitchen has +1.6 so it will lose sales. This means own-label is the better way to protect revenue. However the supermarkets have a lot of power so it depends on whether they give Fernhill more orders.`]
];

function panel(){
  const main=document.querySelector('main');
  const box=document.createElement('div');box.className='card mt';box.id='calBox';
  box.innerHTML=`<h3>Check the marker</h3><p class="tiny">Runs ${SET.length} conclusions written at known levels through the marker. Nothing is saved. It takes a few minutes.</p>
    <div class="row mt"><button class="btn btn-p" id="calRun" type="button">Run the check</button><span class="tiny" id="calSum"></span></div><div id="calOut" class="mt"></div>`;
  main.prepend(box);
  document.getElementById('calRun').onclick=run;
}

async function run(){
  const btn=document.getElementById('calRun'),out=document.getElementById('calOut'),sum=document.getElementById('calSum');
  btn.disabled=true;out.innerHTML='<div class="calrow"><b>Question</b><b>Expected</b><b>Given</b><b>Result</b><b>Marker summary</b></div>';
  let inRange=0,close=0,done=0;
  const results=[];
  for(const [id,lo,hi,text] of SET){
    const q=CBANK.byId[id],max=CBANK.TYPES[q.type].levels;
    const row=document.createElement('div');row.className='calrow';
    row.innerHTML=`<span>${esc(id)}</span><span>${lo===hi?lo:lo+'–'+hi} of ${max}</span><span>…</span><span></span><span class="tiny"></span>`;
    out.appendChild(row);
    try{
      state={q,attempt:1,first:null,second:null};
      let fb=await NMark.markJSON({model:MODEL,max_tokens:2500,temperature:0,system:systemPrompt(q),messages:[{role:'user',content:[{type:'text',text:userText(text,false)}]}]});
      fb=clean(fb,max);
      const ok=fb.level>=lo&&fb.level<=hi,near=!ok&&(fb.level===lo-1||fb.level===hi+1);
      if(ok)inRange++;else if(near)close++;
      row.children[2].textContent=fb.level;
      row.children[3].innerHTML=ok?'<b style="color:var(--green)">As expected</b>':near?'<b style="color:#946200">One level out</b>':'<b style="color:var(--red)">Wrong</b>';
      row.children[4].textContent=fb.summary||'';
      results.push({id,lo,hi,level:fb.level,ok,summary:fb.summary||'',flags:fb.flags});
    }catch(e){row.children[2].textContent='error';row.children[4].textContent=e.message;results.push({id,lo,hi,error:e.message});}
    done++;sum.textContent=`${done} of ${SET.length} done: ${inRange} as expected, ${close} one level out.`;
  }
  window.__calResults=results;
  state=null;btn.disabled=false;
}
panel();
})();
