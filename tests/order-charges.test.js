import test from 'node:test';
import assert from 'node:assert/strict';
import {validOrderCharges} from '../order-charges.js';
import {validMoney,expenseCategoryParts,moneyCSV,parseMoneyCSV} from '../money.js';
import {purchaseAnalysis,shoppingCoverage,validPurchaseItems} from '../purchase-analysis.js';
import {parsePurchaseProposals,applyPurchaseProposals} from '../purchase-import.js';
import {applyReviewedPurchase} from '../purchase-review-state.js';
import {emptyState,validateBackup} from '../domain.js';

const item={name:'상품',family:'상품',category:'생활용품',quantity:1,unit:'개',amount:7000};
const log=()=>({id:'test',date:'2026-01-01',time:'12:00',money:{type:'expense',merchant:'쿠팡',currency:'KRW',amount:10000,category:'미분류',payment:'카드',order:{platform:'쿠팡',id:'test-order',item:'상품',items:[{...item}]}}});
test('확인한 배송·반품비는 정수이며 상품 금액과 함께 결제액을 넘지 않는다',()=>{
 assert.equal(validOrderCharges(undefined),true);
 for(const charges of [null,[],{}, {shipping:-1},{shipping:0.5},{discount:1000},{shipping:3001}])assert.equal(validOrderCharges(charges,10000,7000),false);
 assert.equal(validOrderCharges({shipping:2000,returnFee:1000},10000,7000),true);
 const l=log();l.money.order.charges={shipping:3001};assert.equal(validMoney(l.money),false);
});
test('배송비를 상품 단가나 미확인 금액에 넣지 않고 지출 합계를 보존한다',()=>{
 const l=log();l.money.order.charges={shipping:2000,returnFee:1000};const before=structuredClone(l);
 assert.deepEqual(expenseCategoryParts(l.money),[['생활용품',7000],['배송·반품비',3000]]);
 const a=purchaseAnalysis([l]);assert.equal(a.covered,7000);assert.equal(a.charges,3000);assert.equal(a.unallocated,0);assert.equal(a.trends[0].firstPrice,7000);
 assert.equal(shoppingCoverage([l])[0].unallocated,0);assert.deepEqual(l,before);
});
test('상품 상세가 없어도 확인된 배송비만 분리하고 나머지는 유지한다',()=>{
 const l=log();delete l.money.order.items;l.money.order.charges={shipping:3000};
 assert.deepEqual(expenseCategoryParts(l.money),[['배송·반품비',3000],['쇼핑·상세 미확인',7000]]);
 assert.equal(purchaseAnalysis([l]).unallocated,7000);
});
test('주문 비용 CSV 왕복은 사진·계정과 무관하게 기존 거래 필드를 보존한다',()=>{
 const l=log();l.money.order.charges={shipping:3000};const rows=parseMoneyCSV(moneyCSV([l]),'2026-11-07').rows;
 assert.deepEqual(rows,[{date:l.date,time:l.time,money:l.money}]);
});
test('상품이 이미 있는 주문에는 일치하는 비용만 보완하고 재적용은 건너뛴다',()=>{
 const l=log(),p={id:l.id,date:l.date,platform:'쿠팡',orderId:l.money.order.id,expectedOrderItem:l.money.order.item,expectedAmount:10000,items:[{...item}],charges:{shipping:3000}};
 const proposals=parsePurchaseProposals(JSON.stringify({type:'hazeflow-purchase-proposals',version:1,proposals:[p]}));
 const before=structuredClone(l);assert.deepEqual(applyPurchaseProposals([l],proposals),{changed:1,skipped:0});
 assert.deepEqual(l.money.order.charges,{shipping:3000});delete before.money.order.charges;const copy=structuredClone(l);delete copy.money.order.charges;assert.deepEqual(copy,before);
 assert.deepEqual(applyPurchaseProposals([l],proposals),{changed:0,skipped:1});
 l.money.order.charges={shipping:2000};const changed=structuredClone(l);assert.deepEqual(applyPurchaseProposals([l],proposals),{changed:0,skipped:1});assert.deepEqual(l,changed);
});
test('비용을 열어둔 뒤 다른 화면에서 바꾸면 오래된 상품 저장을 차단한다',()=>{
 const current=log(),opened=structuredClone(current);current.money.order.charges={shipping:3000};
 assert.throws(()=>applyReviewedPurchase(current,opened,[item]),/다른 화면/);
 assert.deepEqual(current.money.order.charges,{shipping:3000});
});
test('백업 저장·복원도 주문 비용과 상품 금액을 분리해서 보존한다',()=>{
 const state=emptyState(),l=log();Object.assign(l,{kind:'가계부',memo:true,text:'지출'});l.money.order.charges={shipping:3000};state.logs=[l];
 assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(state))),state);
 const invalid=structuredClone(state);invalid.logs[0].money.order.charges.shipping=3001;
 assert.throws(()=>validateBackup(invalid),/가계부/);assert.equal(state.logs[0].money.order.charges.shipping,3000);
});
test('전액 할인 상품은 0원 단가를 보존하고 0원 기준 상승률을 만들지 않는다',()=>{
 const l=log();l.money.amount=3000;l.money.order.items[0].amount=0;l.money.order.charges={shipping:3000};
 assert.equal(validMoney(l.money),true);assert.equal(validPurchaseItems([{...item,amount:-1}],3000),false);
 const later=log();later.id='later';later.date='2026-02-01';
 const a=purchaseAnalysis([l,later]);assert.equal(a.trends[0].firstPrice,0);assert.equal(a.trends[0].change,null);assert.equal(a.trends[0].purchases,2);
 assert.deepEqual(parseMoneyCSV(moneyCSV([l]),'2026-11-07').rows[0].money,l.money);
});
test('비용만 남은 반품 주문은 상품을 만들지 않고 비용만 한 번 보완한다',()=>{
 const l=log();delete l.money.order.items;l.money.amount=6000;
 const p={id:l.id,date:l.date,platform:'쿠팡',orderId:l.money.order.id,expectedOrderItem:l.money.order.item,expectedAmount:6000,items:[],charges:{returnFee:6000}};
 const file=proposals=>JSON.stringify({type:'hazeflow-purchase-proposals',version:1,proposals});
 assert.throws(()=>parsePurchaseProposals(file([{...p,charges:undefined}])),/상품별/);
 const proposals=parsePurchaseProposals(file([p]));assert.deepEqual(applyPurchaseProposals([l],proposals),{changed:1,skipped:0});
 assert.deepEqual(l.money.order.items,[]);assert.deepEqual(expenseCategoryParts(l.money),[['배송·반품비',6000]]);
 assert.equal(purchaseAnalysis([l]).unallocated,0);assert.deepEqual(applyPurchaseProposals([l],proposals),{changed:0,skipped:1});
});
test('카드 즉시할인은 상품에 나누지 않고 결제액과 맞춘다',()=>{
 const food=(name,amount)=>({name,family:name,category:'식품',quantity:1,unit:'개',amount});
 const l=log();l.money.amount=18960;l.money.order.items=[food('떡볶이떡',1190),food('어묵',1180),food('통닭',11090),food('고추장',8830)];l.money.order.charges={cardDiscount:3330};
 assert.equal(validMoney(l.money),true);assert.equal(validOrderCharges({discount:3330},18960,22290),false);
 assert.equal(validOrderCharges({cardDiscount:22291},18960,22290),false);
 const parts=expenseCategoryParts(l.money);assert.equal(parts.reduce((s,[,n])=>s+n,0),18960);assert.deepEqual(parts,[['식품',18960]]);
 const a=purchaseAnalysis([l]);assert.equal(a.covered,22290);assert.equal(a.cardDiscounts,3330);assert.equal(a.unallocated,0);
 assert.equal(shoppingCoverage([l])[0].unallocated,0);
});
test('묶음 주문 합계는 개별 상품 단가와 상세 확인률로 사용하지 않는다',()=>{
 const l=log();l.money.order.items=[{...item,amount:10000,quantity:5,priceBasis:'order-summary'}];
 assert.equal(validMoney(l.money),true);const a=purchaseAnalysis([l]);
 assert.equal(a.covered,0);assert.equal(a.summaryAmount,10000);assert.equal(a.unallocated,10000);assert.deepEqual(a.trends,[]);
 assert.equal(shoppingCoverage([l])[0].percent,0);assert.equal(shoppingCoverage([l])[0].unallocated,10000);
 assert.deepEqual(parseMoneyCSV(moneyCSV([l]),'2026-11-07').rows[0].money,l.money);
});
test('카드할인 미배분 상품은 단가에 섞이지 않고 소비 차트에는 순액만 남는다',()=>{
 const l=log();l.money.amount=9000;l.money.order.items=[{...item,amount:12000}];l.money.order.charges={cardDiscount:3000};
 const a=purchaseAnalysis([l]);assert.deepEqual(a.trends,[]);assert.deepEqual(a.categories,[['생활용품',9000]]);assert.equal(a.unallocated,0);
 assert.equal(shoppingCoverage([l])[0].percent,100);assert.deepEqual(expenseCategoryParts(l.money),[['생활용품',9000]]);
 l.money.order.items=[{...item,amount:6000},{...item,name:'식품',category:'식품',amount:6000}];
 assert.equal(expenseCategoryParts(l.money).reduce((s,[,n])=>s+n,0),9000);assert.ok(expenseCategoryParts(l.money).every(([,n])=>n>=0));
});
test('주문정보가 없는 일반 지출도 비용 처리 후 원래 분류 합계를 유지한다',()=>{
 const l=log();delete l.money.order;l.money.category='식비';
 assert.deepEqual(expenseCategoryParts(l.money),[['식비',10000]]);
});
