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
ped:{short:'price elasticity',title:'Price elasticity of demand',mins:4,topics:['3.1.3c'],match:/price elasticity|\bPED\b/i,
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

yed:{short:'income elasticity',title:'Income elasticity of demand',mins:3,topics:['3.1.3c'],match:/income elasticity|\bYED\b/i,
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

market:{short:'market share calculations',title:'Market share, growth and size',mins:4,topics:['3.1.3b'],match:/market share|market growth|market size|segment|share target/i,
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

shares:{short:'share calculations',title:'Shares: market capitalisation and dividends',mins:3,topics:['3.1.2c'],match:/dividend|market capitali|share price/i,
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
  why:'Rising from left to right means positive. Widely spread means weak.'}},

/* ---------- knowledge refreshers (3.1.1 to 3.1.3 marketing mix: product). Wording follows the 7138 specification. ---------- */
smart:{short:'business objectives',title:'Business objectives and SMART',mins:2,kind:'know',topics:['3.1.1c'],match:/\bSMART\b|business objectives?\b|accountable/i,
 cards:[
  {h:'SMART objectives',html:`<p>The AQA specification lists the characteristics of effective objectives as:</p>
   <ul><li><b>Specific</b>: clear about exactly what is to be achieved</li><li><b>Measurable</b>: has a number, so you can tell whether it has been met</li>
   <li><b>Accountable</b>: someone is responsible for meeting it</li><li><b>Realistic</b>: can be achieved with the resources the business has</li><li><b>Time specific</b>: has a deadline</li></ul>
   <p>The A is <b>Accountable</b>, not Achievable. Many websites use Achievable, but the AQA specification does not.</p>`},
  {h:'Why set objectives?',html:`<ul><li>They give the business and its staff a clear direction.</li><li>They help departments work towards the same goals.</li>
   <li>They let managers measure performance and see what needs to change.</li><li>They can motivate staff, as long as they are realistic.</li></ul>
   <p>Example: "Increase online sales by 15%, from £2 million to £2.3 million, by December 2027. The e-commerce manager is responsible."</p>`}
 ],
 check:{q:'In the AQA specification, what does the A in SMART stand for?',options:['Accountable','Achievable','Agreed','Ambitious'],answer:0,
  why:'The specification uses Specific, Measurable, Accountable, Realistic, Time specific.'}},

entrep:{short:'entrepreneurs and decisions',title:'Entrepreneurs and business decisions',mins:3,kind:'know',topics:['3.1.1a','3.1.1b'],match:/entrepreneur|business plan|opportunity cost|ethical dilemma|business planning|non-financial reason|setting up in business/i,
 cards:[
  {h:'Entrepreneurs',html:`<p><b>Reasons for setting up a business</b> can be financial (income, building wealth, profit) or non-financial (independence, doing something you care about, a social aim).</p>
   <p><b>Characteristics in the specification</b>: risk taker, resilient, focused, passionate, innovative, adaptable. Use the one the case study gives evidence for.</p>
   <p>As a business grows, the entrepreneur's role changes from doing everything themselves to delegating, managing and leading others.</p>`},
  {h:'Business decisions',html:`<p>Decisions are influenced by objectives, risk, reward, resources, market conditions, ethics and opportunity costs.</p>
   <ul><li><b>Opportunity cost</b>: the next best alternative given up.</li><li><b>Ethical dilemma</b>: for example, choosing between higher profit and treating workers or suppliers fairly.</li>
   <li><b>Business plan</b>: sets out the idea, the market and the finances. It helps the owner plan and can persuade banks or investors to lend. It cannot guarantee success.</li></ul>`}
 ],
 check:{q:'A business chooses new vans instead of a marketing campaign, which was its next best option. What is the opportunity cost?',options:['The marketing campaign it gave up','The cost of the vans','The profit the vans will make','The interest on a loan for the vans'],answer:0,
  why:'Opportunity cost is the next best alternative given up, which here is the marketing campaign.'}},

forms:{short:'forms of business and stakeholders',title:'Forms of business and stakeholders',mins:3,kind:'know',topics:['3.1.2a','3.1.2b'],match:/sole trader|limited compan|public limited|private limited|limited liability|unlimited liability|co-?operative|social enterprise|stakeholder|forms? of business/i,
 cards:[
  {h:'Forms of business',html:`<ul><li><b>Sole trader</b>: one owner, who keeps all the profit and has <b>unlimited liability</b> (personal possessions can be used to pay business debts).</li>
   <li><b>Private limited company (Ltd)</b>: owned by shareholders with limited liability. Shares cannot be sold to the general public.</li>
   <li><b>Public limited company (plc)</b>: shares can be bought and sold by the public, usually on a stock exchange. Raises more finance, but the founders can lose control.</li>
   <li><b>Co-operatives</b>: owned by their members. Worker co-operatives are owned by the staff, consumer co-operatives by customers, producer co-operatives by producers such as farmers.</li>
   <li><b>Social enterprise</b>: trades like a business, but its main aim is social or environmental, and most profit is reinvested in that aim.</li></ul>`},
  {h:'Stakeholders',html:`<p><b>Internal</b>: employees, owners and shareholders.</p><p><b>External</b>: customers, suppliers, other creditors (such as banks), the community and government.</p>
   <p>Stakeholders can want different things. For example, shareholders may want higher dividends while employees want higher pay. Businesses also have ethical responsibilities to their stakeholders.</p>`}
 ],
 check:{q:'Which of these is an internal stakeholder in the AQA specification?',options:['Employees','Suppliers','The local community','Government'],answer:0,
  why:'Internal stakeholders are employees and owners or shareholders. The others are external.'}},

research:{short:'market research',title:'Market research',mins:3,kind:'know',topics:['3.1.3a'],match:/market research|primary research|secondary research|qualitative data|quantitative data|confidence (level|interval)|market map/i,
 cards:[
  {h:'Types of research and data',html:`<ul><li><b>Primary research</b>: new data collected first-hand by the business, such as surveys or focus groups. Up to date and specific, but costly and slow.</li>
   <li><b>Secondary research</b>: data that already exists, such as government statistics or market reports. Cheaper and quicker, but may be out of date or not quite fit the question.</li>
   <li><b>Quantitative data</b>: numbers. <b>Qualitative data</b>: opinions, feelings and reasons.</li></ul>
   <p>How research is done depends on risk, cost, time and the need for reliable results.</p>`},
  {h:'Confidence levels and market mapping',html:`<p>A result of 40%, with a 95% confidence level and a confidence interval of ±4 percentage points, means we can be 95% confident the true figure is between <b>36% and 44%</b>. A bigger sample usually gives a narrower interval.</p>
   <p>A <b>market map</b> places brands on two axes, such as price and quality. It can show gaps in the market, but a gap may be empty because there is no demand there.</p>`}
 ],
 check:{q:'A survey finds 30% would buy, with a 95% confidence level and a confidence interval of ±5 percentage points. What is the range?',options:['25% to 35%','27.5% to 32.5%','28.5% to 31.5%','30% to 35%'],answer:0,
  why:'±5 percentage points means 5 either side of 30%, so 25% to 35%.'}},

target:{short:'segmentation and target markets',title:'Segmentation and target markets',mins:3,kind:'know',topics:['3.1.3d'],match:/segmentation|target market|niche|mass market|psychographic|demographic|behavioural|geographic/i,
 cards:[
  {h:'Four ways to segment a market',html:`<ul><li><b>Demographic</b>: age, gender, income, family size.</li><li><b>Geographic</b>: where customers live.</li>
   <li><b>Psychographic</b>: lifestyle, values, attitudes and personality.</li><li><b>Behavioural</b>: how customers buy and use the product, such as how often they buy, how loyal they are, or the benefit they want.</li></ul>
   <p>A way to remember the difference: psychographic is about the kind of person the customer is; behavioural is about what they do with the product.</p>`},
  {h:'Niche and mass markets',html:`<ul><li><b>Niche market</b>: small and specialised. Often less competition and higher prices, but a small customer base and risky if tastes change.</li>
   <li><b>Mass market</b>: large. Economies of scale and high sales volumes, but more competition and usually lower prices.</li></ul>
   <p>Once a business chooses its target market, it adapts the marketing mix to suit it.</p>`}
 ],
 check:{q:'Grouping customers by how often they buy and how loyal they are is which type of segmentation?',options:['Behavioural','Psychographic','Demographic','Geographic'],answer:0,
  why:'How customers buy and use a product, including loyalty and how often they buy, is behavioural segmentation.'}},

mobj:{short:'marketing objectives',title:'Marketing objectives',mins:3,kind:'know',topics:['3.1.3e'],match:/marketing objective|marketing aim|conversion|lead generation|brand awareness|customer retention|marketing budget|seasonal demand|cyclical demand/i,
 cards:[
  {h:'The marketing objectives in the specification',html:`<ul><li><b>Lead generation</b>: finding potential customers who show an interest, such as people signing up for information.</li>
   <li><b>Sales</b>: increasing sales volume or sales value.</li><li><b>Market share</b>: increasing the business's percentage of total market sales.</li>
   <li><b>Brand awareness</b>: increasing how many people know the brand.</li><li><b>Customer retention</b>: keeping existing customers coming back.</li>
   <li><b>Engagement</b>: how much customers interact with the brand, such as likes, shares and comments.</li>
   <li><b>Conversion</b>: turning interested people into paying customers, such as the percentage of website visitors who buy.</li></ul>`},
  {h:'What affects them',html:`<p>Marketing objectives are influenced by the business's overall objectives, its finances, competitors, market conditions and the stage of the product life cycle. The marketing budget limits what can be done.</p>
   <p>Changes in demand (a rise or fall, cyclical or seasonal demand) mean the marketing mix may need to change, for example promotions in quiet months.</p>`}
 ],
 check:{q:'An online retailer wants to raise the percentage of website visitors who buy from 2% to 3%. Which marketing objective is this?',options:['Conversion','Lead generation','Brand awareness','Customer retention'],answer:0,
  why:'Turning visitors into paying customers is conversion.'}},

product:{short:'product life cycle and Boston Matrix',title:'Product life cycle and the Boston Matrix',mins:3,kind:'know',topics:['3.1.3f'],match:/product life ?cycle|extension strateg|boston matrix|cash cow|question mark|new product development|product portfolio|marketing mix: product/i,
 cards:[
  {h:'Product life cycle',html:`<p>The stages are development, introduction, growth, maturity and decline.</p>
   <p>The <b>extension strategies</b> in the specification are advertising, rebranding, lowering the price and adapting the product. They try to keep a product in maturity for longer.</p>
   <p>The stage affects other functions too: in development there is spending but no revenue (finance); in growth the business may need more capacity (operations) and staff (HR).</p>`},
  {h:'Boston Matrix and new products',html:`<ul><li><b>Star</b>: high market share in a high-growth market.</li><li><b>Cash cow</b>: high market share in a low-growth market. Its cash can fund other products.</li>
   <li><b>Question mark</b>: low market share in a high-growth market. Needs investment and may or may not succeed.</li><li><b>Dog</b>: low market share in a low-growth market.</li></ul>
   <p><b>New product development</b> can replace products in decline and bring in new sales, but it is expensive and many new products fail.</p>`}
 ],
 check:{q:'A product has the biggest share of a market that is growing by 1% a year. In the Boston Matrix it is a:',options:['Cash cow','Star','Question mark','Dog'],answer:0,
  why:'High market share in a low-growth market makes it a cash cow. A star needs a high-growth market.'}}

};

/* small scatter picture; y is measured from the top, so a smaller y is higher up */
function sc(pts,label){
  return `<figure class="rf-sc"><svg viewBox="0 0 100 100" role="img" aria-label="${label} correlation"><line x1="6" y1="94" x2="96" y2="94"/><line x1="6" y1="94" x2="6" y2="4"/>${pts.map(([x,y])=>`<circle cx="${x+6}" cy="${y}" r="3"/>`).join('')}</svg><figcaption>${label}</figcaption></figure>`;
}

/* which decks a piece of text is about */
function find(text){const t=String(text||'');return Object.keys(DECKS).filter(k=>DECKS[k].match.test(t));}
function names(ids){const n=ids.map(k=>DECKS[k].short);return n.length>1?n.slice(0,-1).join(', ')+' and '+n[n.length-1]:n[0]||'';}
function link(ids,back){return 'refresher.html?d='+ids.join(',')+(back?'&back='+encodeURIComponent(back):'');}

function css(){
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
}

/* pop-up offering refreshers. o = {heading, text, decks:[ids], back, no:'button text', onNo, onAny} */
function ask(o){
  const ids=(o.decks||[]).filter(k=>DECKS[k]).slice(0,4);if(!ids.length)return false;
  css();
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

const DEFAULT=['ped','market','shares'];   /* used only when the work and the student's gaps match no refresher */
/* ---------- compulsory refresher before set work ----------
   Work a teacher sets (and the weekly question sets) stays locked until the
   student has done a refresher on the top three areas it covers. Which areas:
   ones the questions are about, the student's own weak areas first; if the
   questions match nothing, the student's weak areas; if there are none, the
   course's core calculations. Done refreshers are saved to the student's
   account (key "rfgate") so they follow them between devices. */
const GKEY='rfgate';
const Acc=()=>window.Acct;
function gateDone(id){
  if(!id)return true;
  try{const A=Acc(),m=(A&&A.get&&A.get(GKEY))||{};if(m[id])return true;}catch(e){}
  try{return !!localStorage.getItem('rfgate:'+id);}catch(e){return false;}
}
function markDone(id,ids){
  if(!id)return;
  try{localStorage.setItem('rfgate:'+id,'1');}catch(e){}
  try{const A=Acc();if(A&&A.set&&A.get){const m=Object.assign({},A.get(GKEY)||{});m[id]={t:new Date().toISOString(),d:ids||[]};
    const ks=Object.keys(m).sort((a,b)=>String(m[a].t).localeCompare(String(m[b].t)));while(ks.length>200)delete m[ks.shift()];A.set(GKEY,m);}}catch(e){}
}
try{const A=Acc();if(A&&A.merge)A.merge(GKEY,(a,b)=>Object.assign({},b||{},a||{}));}catch(e){}

function pick(items,gapText){
  const n={};
  (items||[]).forEach(it=>{
    const q=typeof it==='string'?it:[it&&it.q,it&&it.label,it&&it.case].filter(Boolean).join(' ');
    find(q).forEach(k=>{n[k]=(n[k]||0)+1;});
    const tp=it&&it.topic;if(tp)Object.keys(DECKS).forEach(k=>{if((DECKS[k].topics||[]).includes(tp))n[k]=(n[k]||0)+.5;});
  });
  const weak=find(gapText||'');
  let ids=Object.keys(n).sort((a,b)=>(weak.includes(b)?1:0)-(weak.includes(a)?1:0)||n[b]-n[a]);
  if(!ids.length)ids=weak.slice();
  if(!ids.length)ids=DEFAULT.filter(k=>DECKS[k]);
  return ids.slice(0,3);
}

/* o = {id, items, gapText, back, onLeave}. Returns {done:true} if the refresher for this
   work is done; otherwise shows the pop-up and returns {done:false, ids, href, text}. */
function gate(o){
  if(gateDone(o.id))return {done:true};
  const ids=pick(o.items,o.gapText);
  if(!ids.length)return {done:true};
  const href=link(ids,o.back)+'&gate='+encodeURIComponent(o.id);
  const list=ids.map(k=>DECKS[k].title),mins=ids.reduce((s,k)=>s+(DECKS[k].mins||3),0);
  const text=`Your refresher topics are: ${list.length>1?list.slice(0,-1).join(', ')+' and '+list[list.length-1]:list[0]}.`;
  css();
  const e=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const old=document.querySelector('.rf-ov');if(old)old.remove();
  const ov=document.createElement('div');ov.className='rf-ov';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');
  ov.innerHTML=`<div class="rf-modal"><h2>Refresher first</h2><p>Before you start this work, you need to do a short refresher. It takes about ${mins} minutes. When you finish, you come straight back to the questions.</p>
    <p><b>${e(text)}</b></p>
    ${ids.map(k=>`<div class="rf-l"><b>${e(DECKS[k].title)}</b><span>About ${DECKS[k].mins} minutes</span></div>`).join('')}
    <div class="rf-b"><a class="rf-all" href="${e(href)}">Start the refresher</a>${o.onLeave?'<button type="button" class="rf-no">Go back</button>':''}</div></div>`;
  document.body.appendChild(ov);
  const no=ov.querySelector('.rf-no');if(no)no.onclick=()=>{ov.remove();o.onLeave();};
  try{ov.querySelector('.rf-all').focus({preventScroll:true});}catch(x){}
  return {done:false,ids,href,text};
}

window.REFRESH={DECKS,find,link,ask,names,gate,gateDone,markDone,pick};
})();
