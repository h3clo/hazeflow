import test from 'node:test';import assert from 'node:assert/strict';import {purchaseAnalysis,validPurchaseItems,suggestPurchase,suggestPurchaseQuantity} from '../purchase-analysis.js';
const row=(id,date,amount,items)=>({id,date,money:{type:'expense',amount,order:{items}}});const egg=(amount)=>({name:'계란 30개',family:'계란',category:'식품',quantity:30,unit:'개',amount});
test('주문 총액은 상품가로 추정하지 않고 확인한 상품 금액만 집계한다',()=>{const a=purchaseAnalysis([row('a','2021-01-01',6000,[egg(5000)]),row('b','2026-01-01',9000,[egg(9000)]),row('c','2026-02-01',10000,undefined)]);assert.equal(a.covered,14000);assert.equal(a.unallocated,11000);assert.equal(a.trends[0].change,80);assert.equal(a.trends[0].lastPrice,300)});
test('같은 날 여러 번 사도 구매 간격은 날짜별로 계산하고 다른 단위는 분리한다',()=>{const a=purchaseAnalysis([row('a','2026-01-01',5000,[egg(5000)]),row('b','2026-01-01',5000,[egg(5000)]),row('c','2026-01-11',5000,[egg(5000)]),row('d','2026-01-12',5000,[{...egg(5000),unit:'g'}])]);assert.equal(a.trends.length,2);assert.equal(a.trends[0].averageDays,10);assert.equal(a.trends[1].averageDays,null)});
test('상품별 배분이 주문 총액을 넘거나 수량이 없으면 저장하지 않는다',()=>{assert.equal(validPurchaseItems([egg(5000)],4000),false);assert.equal(validPurchaseItems([{...egg(5000),quantity:0}],6000),false);assert.equal(suggestPurchase('샴푸 500ml').family,'샴푸')});
test('상품별 수량과 금액을 CSV로 내보내고 다시 읽어도 보존한다',async()=>{const {moneyCSV,parseMoneyCSV}=await import('../money.js');const l={date:'2026-01-01',money:{type:'expense',amount:6000,currency:'KRW',merchant:'매장',category:'',payment:'',order:{platform:'네이버',id:'QA-1',item:'계란',items:[egg(5000)]}}};assert.deepEqual(parseMoneyCSV(moneyCSV([l]),'2026-11-02').rows[0].money.order.items,l.money.order.items)});
test('규격 제안은 용량과 포장 수를 합치고 혼합 상품은 추측하지 않는다',async()=>{const {suggestPurchaseQuantity:q}=await import('../purchase-analysis.js');assert.deepEqual(q('샴푸 500ml, 2개'),{quantity:1000,unit:'ml'});assert.deepEqual(q('샴푸 0.5L x 2'),{quantity:1000,unit:'ml'});assert.deepEqual(q('계란 30구 2판'),{quantity:60,unit:'개'});assert.deepEqual(q('휴지 30롤'),{quantity:30,unit:'롤'});assert.deepEqual(q('샴푸 500ml / 린스 500ml'),{});assert.deepEqual(q('샴푸 500ml + 100ml'),{});assert.deepEqual(q('단호박 1kg'),{quantity:1000,unit:'g'})});

test('단위가격은 1원 미만도 0원으로 반올림하지 않는다',async()=>{const {purchaseUnitPrice,purchasePanel}=await import('../purchase-analysis.js');assert.equal(purchaseUnitPrice(0.45),'0.45원');assert.equal(purchaseUnitPrice(166.666),'166.67원');const p={name:'샴푸',family:'샴푸',category:'생활용품',quantity:10000,unit:'ml',amount:4500};assert.match(purchasePanel([row('a','2026-01-01',4500,[p])],s=>s),/0\.45원\/ml/)});
test('포장 수가 여러 단계면 총 수량을 임의로 제안하지 않는다',async()=>{const {suggestPurchaseQuantity:q}=await import('../purchase-analysis.js');assert.deepEqual(q('샴푸 500ml 2개 3팩'),{});assert.deepEqual(q('샴푸 500ml x 2 x 3'),{});assert.deepEqual(q('샴푸 500ml 2개'),{quantity:1000,unit:'ml'})});

test('단위가격 차트는 같은 날의 가격을 수량 가중 평균하고 실제 구매 간격을 보존한다',()=>{const a=purchaseAnalysis([row('a','2021-01-01',5000,[egg(5000)]),row('b','2021-01-01',9000,[{...egg(9000),quantity:60}]),row('c','2021-01-11',9000,[egg(9000)])]);const g=a.trends[0];assert.equal(g.prices[0].value,14000/90);assert.equal(g.prices[1].value,300);assert.deepEqual(g.gaps,[{label:'2021-01-11',value:10}]);assert.equal(g.key,JSON.stringify(['계란','개']))});
test('소비 패턴은 선택한 품목만 차트로 표시하고 다른 단위와 섞지 않는다',async()=>{const {purchasePanel}=await import('../purchase-analysis.js');const p={name:'샴푸 10L',family:'샴푸',category:'생활용품',quantity:10000,unit:'ml',amount:4500},logs=[row('a','2026-01-01',5000,[egg(5000)]),row('b','2026-02-01',4500,[p])],html=purchasePanel(logs,s=>String(s).replace(/"/g,'&quot;'),JSON.stringify(['샴푸','ml']));assert.match(html,/샴푸 단위가격 변화/);assert.doesNotMatch(html,/계란 단위가격 변화/);assert.match(html,/0\.45원\/ml/);assert.match(html,/<td>0\.45<\/td>/);assert.match(html,/실제 소진 기간과 달라요/);assert.doesNotMatch(html,/NaN|Infinity/)});


test('혼합 주문·범위·앞쪽 포장 수는 단위가격의 분모로 추측하지 않는다',async()=>{
 const {suggestPurchaseQuantity:q}=await import('../purchase-analysis.js');
 for(const name of ['샴푸 500ml 외 2건','샴푸 500ml 포함 총 3건','샴푸 500ml/면도기','샴푸 500~1000ml','샴푸 500ml 1~2개','2개 샴푸 500ml','샴푸 500ml x 2.5','샴푸 500ml x 10001'])assert.deepEqual(q(name),{},name);
});
test('내용 개수와 단순 포장 개수는 한 단계만 곱한다',async()=>{
 const {suggestPurchaseQuantity:q}=await import('../purchase-analysis.js');
 assert.deepEqual(q('계란 30구, 2개'),{quantity:60,unit:'개'});
 assert.deepEqual(q('티슈 180매 6개'),{quantity:1080,unit:'개'});
 assert.deepEqual(q('음료 24병'),{quantity:24,unit:'개'});
 assert.deepEqual(q('음료 190ml, 48개'),{quantity:9120,unit:'ml'});
 assert.deepEqual(q('휴지 30롤, 2개'),{quantity:60,unit:'롤'});
 assert.deepEqual(q('음료 24병 2팩'),{});
});
test('손상된 상품 배분은 전체를 제외해 미배분 금액이 음수가 되지 않는다',()=>{
 const a=purchaseAnalysis([row('bad','2026-01-01',6000,[egg(4000),egg(4000)]),row('ok','2026-01-02',5000,[egg(5000)])]);
 assert.equal(a.total,11000);assert.equal(a.covered,5000);assert.equal(a.unallocated,6000);assert.equal(a.trends[0].rows.length,1);
});

test('발 세정제와 머리 샴푸, 주방세제와 세탁세제는 같은 가격 추이에 섞지 않는다',()=>{
 assert.equal(suggestPurchase('온더바디 발을씻자 풋샴푸 385ml').family,'발 세정제');
 assert.equal(suggestPurchase('나드 샴푸 1L').family,'샴푸');
 assert.equal(suggestPurchase('순샘 주방세제 1.6L').family,'주방세제');
 assert.equal(suggestPurchase('드럼용 액상세제 3.2L').family,'세탁세제');
 assert.equal(suggestPurchase('세제 500ml').family,'');
});
test('띄어쓰기 없는 묶음 입수를 총 용량에 반영하고 모호한 추가 포장은 추측하지 않는다',()=>{assert.deepEqual(suggestPurchaseQuantity('국산콩두부300g2입'),{quantity:600,unit:'g'});assert.deepEqual(suggestPurchaseQuantity('두부 300g 2입'),{quantity:600,unit:'g'});assert.deepEqual(suggestPurchaseQuantity('샴푸 500ml 2입 3팩'),{});assert.deepEqual(suggestPurchaseQuantity('샴푸 500ml 2P'),{});});
test('개월 수를 상품 개수로 오인하지 않는다',()=>{assert.deepEqual(suggestPurchaseQuantity('영양제 6개월분'),{});assert.deepEqual(suggestPurchaseQuantity('샴푸 500ml 6개월 사용'),{quantity:500,unit:'ml'});});
test('봉투의 수용구 수와 실제 매수를 구별하고 박스의 중복 포장 표기를 곱하지 않는다',()=>{assert.deepEqual(suggestPurchaseQuantity('달곰베이킹 머핀봉투2구 화이트, 100장'),{quantity:100,unit:'개'});assert.deepEqual(suggestPurchaseQuantity('코멧 이사박스 5입, 블랙 6호, 5개'),{quantity:5,unit:'개'});assert.deepEqual(suggestPurchaseQuantity('코멧 이사박스 5입, 블랙 6호, 2개'),{});});
test('첫 소비 차트는 최근 한 번 산 물건보다 두 번 이상 비교 가능한 품목을 우선한다',async()=>{const {purchasePanel}=await import('../purchase-analysis.js');const soap={name:'샴푸',family:'샴푸',category:'생활용품',quantity:1,unit:'개',amount:3000};const logs=[row('a','2025-01-01',6000,[egg(6000)]),row('b','2025-02-01',7000,[egg(7000)]),row('c','2026-11-05',3000,[soap])];const esc=s=>String(s).replace(/"/g,'&quot;');const html=purchasePanel(logs,esc);assert.match(html,/계란 단위가격 변화/);assert.doesNotMatch(html,/샴푸 단위가격 변화/);assert.match(purchasePanel(logs,esc,JSON.stringify(['샴푸','개'])),/샴푸 단위가격 변화/);});
