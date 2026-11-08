import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseMoneyLogs} from '../money-diagnose.js';

const money=(over={})=>({type:'expense',amount:5000,currency:'KRW',merchant:'카페',category:'식비',payment:'카드',...over});
const log=(id,over={})=>({id,date:'2026-11-01',time:'12:00',kind:'가계부',memo:true,money:money(over.money),...over});

test('완전 동일 거래와 같은 날·금액 후보를 구분하고 원본을 바꾸지 않는다',()=>{
 const a=log('a'),b=log('b'),c=log('c',{money:money({merchant:'다른가게'})});
 const logs=[a,b,c];
 const before=structuredClone(logs);
 const report=diagnoseMoneyLogs(logs);
 assert.equal(report.summary.medium>=1,true);
 assert.ok(report.findings.some(f=>f.kind==='duplicate'));
 assert.ok(report.findings.some(f=>f.kind==='same-day-amount'));
 assert.deepEqual(logs,before);
});

test('끊긴 식사 연결과 주문번호 충돌을 후보로만 표시한다',()=>{
 const expense=log('exp',{money:money({order:{platform:'네이버',id:'O1',item:'상품'}})});
 const other=log('exp2',{money:money({merchant:'네이버페이',order:{platform:'네이버',id:'O1',item:'상품'}})});
 const meal={id:'meal',date:'2026-11-01',kind:'식사',text:'김밥',expenseId:'missing'};
 const report=diagnoseMoneyLogs([expense,other,meal]);
 assert.ok(report.findings.some(f=>f.kind==='meal-orphan'));
 assert.ok(report.findings.some(f=>f.kind==='order-collision'));
});
