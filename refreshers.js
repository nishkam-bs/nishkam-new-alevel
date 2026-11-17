/* =====================================================================
   Refreshers: short card decks on one calculation area each, used before
   set work and after marking. Written and checked by hand against the 7138
   formulae (Annex) and mark notes; every worked figure has been checked.
   No student data in this file. Used by refresher.html, practice.html and
   the home page (My marks).
   ===================================================================== */
(function(){
"use strict";
const F=s=>`<div class="rf-formula">${s}</div>`;

const DECKS={
ped:{short:'price elasticity',title:'Price elasticity of demand',mins:4,match:/price elasticity|\bPED\b/i,
 cards:[
  {h:'The rule',html:`${F('PED = % change in quantity demanded ÷ % change in price')}
   <p>Quantity goes on top. Price goes on the bottom.</p>
   <p>Each % change is worked out the usual way: (new − old) ÷ old × 100.</p>
   <p>PED is usually negative, because when the price goes up, people buy less. To judge it, ignore the minus sign:</p>
   <ul><li>more than 1: <b>price elastic</b>. Quantity changes by a bigger % than price.</li><li>less than 1: <b>price inelastic</b>. Quantity changes by a smaller % than price.</li></ul>`},
  {h:'Worked example: calculating PED',type:'steps',intro:'A gym raises its monthly price from £40 to £44. Members fall from 2,000 to 1,700.',
   steps:['% change in price = (44 − 40) ÷ 40 × 100 = +10%','% change in quantity demanded = (1,700 − 2,000) ÷ 2,000 × 100 = −15%','PED = −15 ÷ +10 = −1.5','Ignoring the sign, 1.5 is more than 1, so demand is price elastic.']},
  {h:'Using PED to find the new sales',html:`${F('% change in quantity = PED × % change in price')}
   <p>When the price changes, the number sold changes too. Work out the new quantity first, then the revenue:</p>
   <ol><li>% change in quantity = PED × % change in price</li><li>New quantity</li><li>New price</li><li>Old revenue and new revenue (price × quantity)</li><li>Change in revenue = new − old</li></ol>`},
  {h:'Worked example: what happens to revenue',type:'steps',intro:'A coffee shop sells 8,000 drinks a month at £3.00. PED is −0.5. It raises the price by 10%.',
   steps:['% change in quantity = −0.5 × +10% = −5%','New quantity = 8,000 × 0.95 = 7,600 drinks','New price = £3.00 × 1.10 = £3.30','Old revenue = 8,000 × £3.00 = £24,000. New revenue = 7,600 × £3.30 = £25,080','Revenue rises by £1,080. Demand is price inelastic, so the price rise increases revenue.']},
  {h:'Common mistakes',html:`<ul><li><b>Keeping the old quantity.</b> If the price changes, the quantity changes too. Work out the new quantity before you work out revenue.</li>
   <li><b>Dividing the wrong way.</b> Price ÷ quantity gives the wrong answer (−0.67 instead of −1.5 in the gym example).</li>
   <li><b>Giving a % when the question asks for £.</b> "Calculate the change in revenue" wants a figure in pounds.</li>
   <li><b>Using the new figure as the base.</b> Always divide by the old figure.</li></ul>`}
 ],
 check:{q:'The price of a product falls by 5%. PED is −2. What happens to the quantity demanded?',options:['It rises by 10%','It falls by 10%','It rises by 2.5%','It falls by 2.5%'],answer:0,
  why:'% change in quantity = PED × % change in price = −2 × −5% = +10%. A price cut means people buy more.'}},

yed:{short:'income elasticity',title:'Income elasticity of demand',mins:3,match:/income elasticity|\bYED\b/i,
 cards:[
  {h:'The rule',html:`${F('YED = % change in quantity demanded ÷ % change in income')}
   <p>The sign matters for YED:</p>
   <ul><li><b>Positive</b>: a normal good. As incomes rise, people buy more.</li><li><b>Above +1</b>: demand rises faster than income, as it often does for luxuries.</li><li><b>Negative</b>: an inferior good. As incomes rise, people buy less, for example value ranges.</li></ul>
   <p>YED is just a number. It doesn't have a % sign.</p>`},
  {h:'Worked example: calculating YED',type:'steps',intro:'Incomes rise by 4%. A restaurant\'s bookings rise from 5,000 to 5,300.',
   steps:['% change in quantity demanded = (5,300 − 5,000) ÷ 5,000 × 100 = +6%','YED = +6 ÷ +4 = +1.5','It is positive and above 1, so bookings rise faster than income.']},
  {h:'Forecasting sales and revenue',type:'steps',intro:'A value-range biscuit sells 200,000 packs a year at £1.20. YED is −0.5. Incomes are forecast to rise by 6%. The price stays the same.',
   steps:['% change in quantity = YED × % change in income = −0.5 × +6% = −3%','New quantity = 200,000 × 0.97 = 194,000 packs','Old revenue = 200,000 × £1.20 = £240,000. New revenue = 194,000 × £1.20 = £232,800','Revenue falls by £7,200. A negative YED means a rise in income leads to fewer sales.']},
  {h:'Common mistakes',html:`<ul><li><b>Losing the sign.</b> A negative YED with rising incomes means sales fall. Say so in your answer: "falls by £7,200".</li>
   <li><b>Stopping too early.</b> The % change in quantity is not YED. Divide it by the % change in income.</li>
   <li><b>Applying the change to the wrong figure.</b> Use the latest sales figure the question gives you as the starting point.</li></ul>`}
 ],
 check:{q:'YED for a product is +2. Incomes fall by 3%. What happens to the quantity demanded?',options:['It falls by 6%','It rises by 6%','It falls by 1.5%','It rises by 1.5%'],answer:0,
  why:'% change in quantity = YED × % change in income = +2 × −3% = −6%.'}},

roms:{short:'return on marketing spend',title:'Return on marketing spend',mins:3,match:/return on marketing|marketing spend|campaign/i,
 cards:[
  {h:'The rule',html:`${F('Return on marketing spend (%) = profit from marketing activities ÷ marketing spend × 100')}
   <p>It shows how much profit each £1 spent on marketing brings back, as a percentage.</p>
   <p>Read carefully what profit figure you've been given. If the question gives the <b>extra gross profit</b> from a campaign and the <b>cost</b> of the campaign separately, take the cost off first. What's left is the profit from marketing.</p>`},
  {h:'Worked example',type:'steps',intro:'A campaign costs £20,000. It brings in £32,000 of extra gross profit.',
   steps:['Profit from marketing = £32,000 − £20,000 = £12,000','Return on marketing spend = £12,000 ÷ £20,000 × 100 = 60%','For every £1 spent, the campaign made 60p profit after paying for itself.']},
  {h:'Is the campaign worth it?',html:`<p>Some questions ask you to compare a campaign with another option, such as a price change. Work out the change in revenue (or profit) the campaign brings, then <b>take off what it costs</b>.</p>
   <p>Example: a campaign costing £15,000 raises revenue from £720,000 to £763,200. The gain is £43,200 − £15,000 = £28,200.</p>`},
  {h:'Common mistakes',html:`<ul><li><b>Not taking the cost off.</b> £32,000 ÷ £20,000 × 100 = 160% is wrong when £32,000 is profit before the cost of the campaign.</li>
   <li><b>Adding profit and spend together.</b> They never get added.</li>
   <li><b>Dividing the wrong way.</b> Spend goes on the bottom.</li>
   <li><b>Not answering the question.</b> If it asks which campaign is better, name it. The one with the higher return gives more per £1, even if the other made more profit in total.</li></ul>`}
 ],
 check:{q:'A campaign costs £50,000 and brings in £65,000 of extra gross profit. What is the return on marketing spend?',options:['30%','130%','77%','23%'],answer:0,
  why:'Profit from marketing = £65,000 − £50,000 = £15,000. £15,000 ÷ £50,000 × 100 = 30%.'}},

pts:{short:'percentage change',title:'Percentage points and percentage change',mins:2,match:/percentage point|change in (the )?market share|% change in market share/i,
 cards:[
  {h:'The rule',html:`<p>When you compare two percentages, there are two different answers:</p>
   ${F('Change in percentage points = new % − old %')}
   ${F('Percentage change = (new % − old %) ÷ old % × 100')}
   <p>Read the question to see which one it wants. "Calculate the percentage change" wants the second.</p>`},
  {h:'Worked example',type:'steps',intro:'A business\'s market share falls from 20% to 18%.',
   steps:['Change in percentage points = 18 − 20 = −2 percentage points','Percentage change = (18 − 20) ÷ 20 × 100 = −10%','So "market share fell by 2 percentage points" and "market share fell by 10%" describe the same change.']},
  {h:'Common mistakes',html:`<ul><li><b>Giving the points as a %.</b> Writing −2% when the question asks for the percentage change.</li>
   <li><b>Rounding first.</b> If a share is 13.75%, use 13.75 in the next step, not 14. Rounding early changes the answer (−6.67% instead of −8.33%).</li>
   <li><b>Turning shares into decimals halfway through.</b> Keep them as percentages all the way through.</li></ul>`}
 ],
 check:{q:'Market share rises from 12% to 15%. What is the percentage change in market share?',options:['+25%','+3%','+20%','+125%'],answer:0,
  why:'(15 − 12) ÷ 12 × 100 = +25%. The rise of 3 is in percentage points.'}},

index:{short:'index numbers',title:'Index numbers',mins:3,match:/index/i,
 cards:[
  {h:'The rule',html:`${F('Index number = figure for the year ÷ figure for the base year × 100')}
   <p>The base year is always 100. An index of 115 means 15% higher than the base year. It does not mean 15% higher than last year.</p>`},
  {h:'Worked example: making index numbers',type:'steps',intro:'Sales were £400,000 in 2022 (the base year), £430,000 in 2023 and £460,000 in 2024.',
   steps:['2022: 400,000 ÷ 400,000 × 100 = 100','2023: 430,000 ÷ 400,000 × 100 = 107.5','2024: 460,000 ÷ 400,000 × 100 = 115']},
  {h:'Using index numbers',type:'steps',intro:'Two things questions often ask:',
   steps:['Change between two years: (115 − 107.5) ÷ 107.5 × 100 = 6.98%. It is not 7.5%, because the base for this change is 2023, not 2022.','Working back: if sales in 2026 were £5m and the index was 125, base-year sales = £5m ÷ 125 × 100 = £4m.']},
  {h:'Common mistakes',html:`<ul><li><b>Treating index points as a %.</b> 126 − 112 = 14 points, but the % change is 14 ÷ 112 × 100 = 12.5%.</li>
   <li><b>Working back the wrong way.</b> Divide by the index number and multiply by 100. Don't divide by 100 or by the sales figure.</li></ul>`}
 ],
 check:{q:'A sales index rises from 120 to 132. What is the percentage change in sales?',options:['10%','12%','132%','1.1%'],answer:0,
  why:'(132 − 120) ÷ 120 × 100 = 10%. The 12 is the change in index points.'}},

market:{short:'market share calculations',title:'Market share, growth and size',mins:4,match:/market share|market growth|market size|segment|share target/i,
 cards:[
  {h:'The rules',html:`${F('Market share (%) = sales of the business ÷ total sales in the market × 100')}
   ${F('Market growth (%) = change in the size of the market ÷ original size of the market × 100')}
   <p>For growth, always divide by the <b>original</b> size, not the new one.</p>`},
  {h:'A segment of a segment',type:'steps',intro:'A £3bn market. 40% of it is premium products. Within premium, 25% is organic.',
   steps:['Premium segment = £3bn × 0.40 = £1.2bn','Organic premium = £1.2bn × 0.25 = £300m','Taking 25% of the whole market (£750m) would be wrong. The 25% is a share of the premium segment.']},
  {h:'Hitting a share target in a growing market',type:'steps',intro:'A business sells £66m in a £500m market. The market will grow by 10%. The target is a 15% share next year.',
   steps:['Next year\'s market = £500m × 1.10 = £550m','Target sales = 15% × £550m = £82.5m','Increase needed = £82.5m − £66m = £16.5m','% increase = £16.5m ÷ £66m × 100 = 25%']},
  {h:'Common mistakes',html:`<ul><li><b>Ignoring market growth.</b> In the example above, using this year's market gives a target of £75m, which is too low.</li>
   <li><b>Comparing shares instead of sales.</b> Work out the target <b>sales</b>, then compare them with the current sales.</li>
   <li><b>Units.</b> A segment can't be bigger than the market it belongs to. Check whether your answer is in millions or billions.</li></ul>`}
 ],
 check:{q:'A market is worth £200m and will grow by 5%. A business wants a 10% share next year. What sales does it need?',options:['£21m','£20m','£10.5m','£30m'],answer:0,
  why:'Next year\'s market = £200m × 1.05 = £210m. 10% of £210m = £21m.'}},

shares:{short:'share calculations',title:'Shares: market capitalisation and dividends',mins:3,match:/dividend|market capitali|share price/i,
 cards:[
  {h:'The rules',html:`${F('Market capitalisation = number of issued shares × current share price')}
   ${F('Dividend per share = total dividend paid ÷ number of ordinary shares in issue')}
   ${F('Dividend yield (%) = dividend per share ÷ share price × 100')}`},
  {h:'Worked example',type:'steps',intro:'A plc has 50 million shares. The share price is 240p. It paid £6 million in dividends.',
   steps:['Market capitalisation = 50,000,000 × £2.40 = £120 million','Dividend per share = £6,000,000 ÷ 50,000,000 = £0.12 = 12p','Dividend yield = 12p ÷ 240p × 100 = 5%']},
  {h:'Common mistakes',html:`<ul><li><b>Pence and pounds.</b> Change the share price to pounds before you work out market capitalisation (240p = £2.40). For dividend yield, keep both figures in pence.</li>
   <li><b>Sign of a change.</b> If the share price falls by 15%, write −15% or "a fall of 15%".</li>
   <li><b>When the share price falls but the dividend stays the same,</b> the dividend yield rises.</li></ul>`}
 ],
 check:{q:'Dividend per share is 8p and the share price is 200p. What is the dividend yield?',options:['4%','25%','0.04%','40%'],answer:0,
  why:'8 ÷ 200 × 100 = 4%. Both figures are in pence, so no conversion is needed.'}},

sales:{short:'sales figures',title:'Sales volume and sales value',mins:3,match:/sales volume|sales value|average (selling )?price|per shop|by region/i,
 cards:[
  {h:'The rules',html:`<p><b>Sales volume</b> is the number of units sold. <b>Sales value</b> (revenue) is in pounds.</p>
   ${F('Sales value = selling price per unit × number of units sold')}
   ${F('Average selling price = sales value ÷ sales volume')}
   <p>Check which one the question is asking about before you start.</p>`},
  {h:'Worked example',type:'steps',intro:'In 2025 a business sold 10,000 units for £150,000. In 2026 it sold 11,000 units for £176,000.',
   steps:['% change in sales value = (176,000 − 150,000) ÷ 150,000 × 100 = 17.3%','Average price 2025 = £150,000 ÷ 10,000 = £15.00. 2026 = £176,000 ÷ 11,000 = £16.00','% change in average price = (16 − 15) ÷ 15 × 100 = 6.7%','Volume rose by 10%, so most of the growth in value came from selling more units.']},
  {h:'Common mistakes',html:`<ul><li><b>Using volume when the question asks about value.</b></li>
   <li><b>Rounding in the middle.</b> Keep the full figure (for example £19.86, not £19.90) until the final answer.</li>
   <li><b>Adding up totals.</b> Check a total before you use it in the next step.</li></ul>`}
 ],
 check:{q:'Sales value is £90,000 and sales volume is 6,000 units. What is the average selling price?',options:['£15','£1.50','£0.07','£150'],answer:0,
  why:'£90,000 ÷ 6,000 = £15 per unit.'}},

correl:{short:'correlation',title:'Correlation',mins:2,match:/correlation|scatter/i,
 cards:[
  {h:'Reading a scatter graph',html:`<div class="rf-svgs">${sc([[10,80],[20,70],[30,62],[40,55],[50,44],[60,38],[70,28],[80,20]],'Strong positive')}${sc([[10,70],[20,45],[30,65],[40,40],[50,62],[60,48],[70,30],[80,45]],'Weak positive')}${sc([[10,25],[20,32],[30,38],[40,48],[50,55],[60,62],[70,72],[80,78]],'Strong negative')}</div>
   <ul><li><b>Positive</b>: the points rise from left to right. <b>Negative</b>: they fall.</li><li><b>Strong</b>: the points sit close to a straight line. <b>Weak</b>: they are widely scattered.</li></ul>`},
  {h:'What it does and doesn\'t show',html:`<p>Correlation shows that two things move together. It doesn't prove that one causes the other. Other factors may be involved.</p>
   <p>With weak correlation, the factor on the x-axis is only one of several things affecting the result.</p>`}
 ],
 check:{q:'On a scatter graph the points rise from left to right but are widely spread out. Which describes it?',options:['Weak positive correlation','Strong positive correlation','Weak negative correlation','Strong negative correlation'],answer:0,
  why:'Rising from left to right means positive. Widely spread means weak.'}}
};

/* small scatter picture; y is measured from the top, so a smaller y is higher up */
function sc(pts,label){
  return `<figure class="rf-sc"><svg viewBox="0 0 100 100" role="img" aria-label="${label} correlation"><line x1="6" y1="94" x2="96" y2="94"/><line x1="6" y1="94" x2="6" y2="4"/>${pts.map(([x,y])=>`<circle cx="${x+6}" cy="${y}" r="3"/>`).join('')}</svg><figcaption>${label}</figcaption></figure>`;
}

/* which decks a piece of text is about */
function find(text){const t=String(text||'');return Object.keys(DECKS).filter(k=>DECKS[k].match.test(t));}
function names(ids){const n=ids.map(k=>DECKS[k].short);return n.length>1?n.slice(0,-1).join(', ')+' and '+n[n.length-1]:n[0]||'';}
function link(ids,back){return 'refresher.html?d='+ids.join(',')+(back?'&back='+encodeURIComponent(back):'');}

/* pop-up offering refreshers. o = {heading, text, decks:[ids], back, no:'button text', onNo, onAny} */
function ask(o){
  const ids=(o.decks||[]).filter(k=>DECKS[k]).slice(0,4);if(!ids.length)return false;
  if(!document.getElementById('rf-style')){const st=document.createElement('style');st.id='rf-style';st.textContent=`.rf-ov{position:fixed;inset:0;z-index:9998;background:rgba(10,15,25,.55);display:flex;align-items:center;justify-content:center;padding:16px}
.rf-modal{background:#fff;color:#1a1a1a;max-width:520px;width:100%;max-height:88vh;overflow:auto;border-radius:14px;padding:24px 26px;font:15px/1.55 "IBM Plex Sans",system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.rf-modal h2{font:400 1.5rem "DM Serif Display",Georgia,serif;margin:0 0 10px;color:#0E2A47}.rf-modal p{margin:0 0 12px}
.rf-modal .rf-l{display:block;text-decoration:none;border:1px solid #E5DFD2;border-radius:10px;padding:10px 14px;margin-bottom:8px;color:inherit}
.rf-modal .rf-l b{display:block}.rf-modal .rf-l span{font-size:.85rem;color:#6B6B6B}
.rf-modal .rf-l:hover{border-color:#0E2A47}
.rf-modal .rf-b{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
.rf-modal .rf-b a,.rf-modal .rf-b button{padding:10px 18px;border-radius:9px;font:600 15px "IBM Plex Sans",system-ui,sans-serif;cursor:pointer;text-decoration:none}
.rf-modal .rf-all{background:#0E2A47;color:#fff;border:0}.rf-modal .rf-no{background:transparent;color:inherit;border:1px solid #E5DFD2}
@media (prefers-color-scheme:dark){.rf-modal{background:#172133;color:#e9ecf2}.rf-modal h2{color:#cfe0f5}.rf-modal .rf-l,.rf-modal .rf-no{border-color:rgba(255,255,255,.15)}.rf-modal .rf-l span{color:#9aa4b6}.rf-modal .rf-all{background:#cfe0f5;color:#0e1420}}`;document.head.appendChild(st);}
  const ov=document.createElement('div');ov.className='rf-ov';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');
  const e=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  ov.innerHTML=`<div class="rf-modal"><h2>${e(o.heading||'Do you need a refresher?')}</h2><p>${e(o.text||'')}</p>
    ${ids.map(k=>`<a class="rf-l" href="${e(link([k],o.back))}"><b>${e(DECKS[k].title)}</b><span>About ${DECKS[k].mins} minutes: the rule, a worked example, where you went wrong, and a quick check</span></a>`).join('')}
    <div class="rf-b">${ids.length>1?`<a class="rf-all" href="${e(link(ids,o.back))}">Do all ${ids.length}</a>`:''}<button type="button" class="rf-no">${e(o.no||'No thanks')}</button></div></div>`;
  document.body.appendChild(ov);
  ov.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{if(o.onAny)o.onAny();}));
  ov.querySelector('.rf-no').onclick=()=>{if(o.onAny)o.onAny();ov.remove();if(o.onNo)o.onNo();};
  try{ov.querySelector('.rf-no').focus({preventScroll:true});}catch(x){}
  return true;
}

window.REFRESH={DECKS,find,link,ask,names};
})();
