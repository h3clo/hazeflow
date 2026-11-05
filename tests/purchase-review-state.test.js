import test from 'node:test';
import assert from 'node:assert/strict';
import {applyReviewedPurchase} from '../purchase-review-state.js';
const item={name:'우유',family:'우유',category:'식품',quantity:1000,unit:'ml',amount:3000};
const log=()=>({id:'order-log',date:'2026-11-05',kind:'가계부',text:'원문',money:{type:'expense',currency:'KRW',amount:5000,merchant:'네이버',category:'장보기',payment:'카드',order:{platform:'네이버',id:'order-1',item:'우유 외 1건'}}});
test('상품 정리 창을 연 뒤 다른 기기에서 저장한 상품을 덮지 않는다',()=>{
 const opened=log(),current=structuredClone(opened);current.money.order.items=[{...item,amount:4000}];const saved=structuredClone(current);
 assert.throws(()=>applyReviewedPurchase(current,opened,[item]),/다른 화면/);assert.deepEqual(current,saved);
});
test('수정 중 달라진 주문 금액·날짜·주문번호·상품명과 삭제를 감지한다',()=>{
 for(const edit of [l=>l.money.amount=6000,l=>l.date='2026-11-04',l=>l.money.order.id='other',l=>l.money.order.item='다른 상품']){const opened=log(),current=structuredClone(opened);edit(current);const saved=structuredClone(current);assert.throws(()=>applyReviewedPurchase(current,opened,[item]),/다른 화면/);assert.deepEqual(current,saved)}
 assert.throws(()=>applyReviewedPurchase(undefined,log(),[item]),/찾지 못/);
});
test('검토 대상이 같으면 최신 결제수단·메모를 유지하고 상품 정보만 저장한다',()=>{
 const opened=log(),current=structuredClone(opened);current.money.payment='온누리카드';current.text='새 메모';const items=[structuredClone(item)];applyReviewedPurchase(current,opened,items);assert.equal(current.money.payment,'온누리카드');assert.equal(current.text,'새 메모');items[0].amount=99999;assert.equal(current.money.order.items[0].amount,3000);
 const before=structuredClone(current);assert.throws(()=>applyReviewedPurchase(current,before,[{...item,amount:6000}]),/수량과 금액/);assert.deepEqual(current,before);
});
