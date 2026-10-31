import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMoney,monthMoney,moneyCSV,validMoney,moneyText} from '../money.js';
import {emptyState,validateBackup,activityIntervals,dayDocument} from '../domain.js';
import {flattenState,unflattenState} from '../sync-state.js';
const money=(type,amount,category='식비')=>({type,amount,category,merchant:'점심',payment:'카드',currency:'KRW'});
const log=(id,type,amount,date='2026-10-31')=>({id,date,time:'12:00',kind:'가계부',memo:true,money:money(type,amount),text:moneyText(money(type,amount))});
test('상호·금액·결제수단을 짧게 읽고 잘못된 금액을 거부한다',()=>{assert.deepEqual(parseMoney('스타벅스 5,800원 카드'),{merchant:'스타벅스',amount:5800,payment:'카드'});assert.equal(parseMoney('편의점 3500').amount,3500);for(const s of ['커피','커피 0','커피 -100','커피 5,,800'])assert.throws(()=>parseMoney(s))});
test('월별 지출·수입·이체를 분리하고 지출만 분류 합계에 넣는다',()=>{const logs=[log('a','expense',5800),log('b','income',100000),log('c','transfer',20000),log('d','expense',1000,'2026-09-01')];const s=monthMoney(logs,'2026-10');assert.deepEqual(s.totals,{expense:5800,income:100000,transfer:20000});assert.deepEqual(s.categories,[['식비',5800]]);logs[0].money.category='__proto__';assert.equal(monthMoney(logs,'2026-10').categories[0][1],5800)});
test('거래를 백업·동기화·MD에 보존하고 활동 구간을 끊지 않는다',()=>{const d=emptyState();d.logs=[{id:'activity',date:'2026-10-31',time:'11:00',kind:'일상',text:'공부'},log('a','expense',5800)];assert.deepEqual(unflattenState(flattenState(d)).logs,d.logs);assert.equal(activityIntervals(d,new Date('2026-10-31T15:00:00')).get('activity').ongoing,true);assert.match(dayDocument(d,'2026-10-31'),/5,800원/);d.logs[1].money.amount=-1;assert.throws(()=>validateBackup(d));assert.equal(validMoney(money('unknown',100)),false)});
test('CSV는 거래 항목을 보존하며 스프레드시트 수식 실행을 방지한다',()=>{const l=log('a','expense',5800);l.money.merchant='=SUM(1,2)';const csv=moneyCSV([l]);assert.match(csv,/금액/);assert.match(csv,/'=SUM/);assert.match(csv,/KRW/);assert.match(csv,/5800/)});

 test('주간 소비는 전주 같은 기간과 비교하고 이체·미래 거래를 제외한다',async()=>{const {weekSummary}=await import('../insights.js');const d=emptyState();d.logs=[log('a','expense',5800,'2026-10-26'),log('b','expense',3000,'2026-10-19'),log('c','transfer',100000,'2026-10-26'),log('d','expense',9000,'2026-10-27')];const s=weekSummary(d,'2026-10-26','2026-10-26');assert.equal(s.money.expense,5800);assert.equal(s.money.previousExpense,3000);assert.deepEqual(s.money.top,['식비',5800])});
