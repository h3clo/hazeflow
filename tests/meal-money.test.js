import test from 'node:test';
import assert from 'node:assert/strict';
import {mealExpense,setMealExpense,unlinkMealExpense} from '../meal-money.js';
import {emptyState,validateBackup,dayDocument,activityIntervals} from '../domain.js';
import {monthMoney,moneyCSV,parseMoneyCSV,planMoneyImport} from '../money.js';
import {dayStats,weekSummary} from '../insights.js';
import {flattenState,unflattenState} from '../sync-state.js';
import {journalDraft} from '../journal.js';
const values={kind:'식사',text:'닭다리살 덮밥',mealAmount:'9000',mealMerchant:'동네 식당',mealPayment:'카드'};
const meal=()=>setMealExpense({id:'meal',date:'2026-10-31',time:'12:00',kind:'식사',text:values.text,photos:[],memo:false},values);
test('식사에 금액만 더해 지출을 만들고 선택 항목은 안전한 기본값을 쓴다',()=>{const m=mealExpense({...values,mealMerchant:''});assert.equal(m.amount,9000);assert.equal(m.merchant,'닭다리살 덮밥');assert.equal(m.category,'식비');assert.equal(mealExpense({...values,mealAmount:''}),undefined);for(const amount of ['0','-100','0.5','NaN'])assert.throws(()=>mealExpense({...values,mealAmount:amount}));assert.throws(()=>mealExpense({...values,kind:'일상'}))});
test('한 기록이 식사·가계부·주간 회고·시간 구간에 한 번씩 반영된다',()=>{const d=emptyState();d.logs=[meal()];assert.equal(dayStats(d,'2026-10-31').meals,1);assert.equal(monthMoney(d.logs,'2026-10').totals.expense,9000);assert.equal(weekSummary(d,'2026-10-31','2026-10-31').money.expense,9000);assert.equal(activityIntervals(d,new Date('2026-10-31T15:00:00')).get('meal').ongoing,true);assert.equal(d.logs.length,1)});
test('금액 수정과 연결 해제는 식사 원문·사진·시간을 보존한다',()=>{const original=meal(),before=structuredClone(original),changed=setMealExpense(original,{...values,mealAmount:'10000'});assert.equal(changed.money.amount,10000);const unlinked=unlinkMealExpense(changed);assert.equal(unlinked.money,undefined);assert.equal(unlinked.text,original.text);assert.equal(unlinked.time,'12:00');assert.deepEqual(unlinked.photos,original.photos);assert.deepEqual(original,before);assert.equal(setMealExpense(original,{...values,mealAmount:''}).money,undefined)});
test('연결된 식사를 백업·동기화·문서·일기 초안에 보존한다',()=>{const d=emptyState();d.logs=[meal()];assert.deepEqual(validateBackup(d).logs,d.logs);assert.deepEqual(unflattenState(flattenState(d)).logs,d.logs);assert.match(dayDocument(d,'2026-10-31'),/식사 지출: 9,000원/);const draft=journalDraft(d,'2026-10-31');assert.match(draft,/닭다리살 덮밥/);assert.match(draft,/지출 9,000원/);d.logs[0].money.type='income';assert.throws(()=>validateBackup(d))});
test('연결 식사의 CSV를 다시 가져와도 같은 지출을 중복 추가하지 않는다',()=>{const logs=[meal()],rows=parseMoneyCSV(moneyCSV(logs),'2026-10-31').rows;assert.equal(planMoneyImport(logs,rows).accepted.length,0)});
test('식사 지출 수정은 사용 범위·실제 부담자를 보존하고 새 값은 저장 전에 검증한다',()=>{const original=meal();original.money.scope='household';original.money.payer='아빠';const updated=setMealExpense(original,{...values,mealAmount:'11000'});assert.equal(updated.money.scope,'household');assert.equal(updated.money.payer,'아빠');const changed=setMealExpense(original,{...values,scope:'personal',payer:' 본인 '});assert.equal(changed.money.scope,'personal');assert.equal(changed.money.payer,'본인');for(const patch of [{scope:'invalid'},{payer:'가'.repeat(81)}])assert.throws(()=>setMealExpense(original,{...values,...patch}));assert.equal(original.money.payer,'아빠');});

test('따로 등록한 영수증과 여러 식사를 연결해도 지출은 한 번만 집계한다',async()=>{
 const {linkMealToExpense,expenseForMeal}=await import('../meal-money.js');
 const expense={id:'receipt',date:'2026-10-31',time:'11:35',kind:'가계부',memo:true,text:'장보기',photos:[],money:{type:'expense',amount:30000,currency:'KRW',merchant:'마트',category:'장보기',payment:'카드'}};
 const lunch=meal(),dinner={...meal(),id:'dinner',time:'19:00',text:'저녁'};
 let logs=linkMealToExpense([lunch,dinner,expense],'meal','receipt');logs=linkMealToExpense(logs,'dinner','receipt');
 assert.equal(monthMoney(logs,'2026-10').totals.expense,30000);assert.equal(logs[0].time,'12:00');assert.equal(logs[2].time,'11:35');assert.equal(logs[0].text,lunch.text);assert.equal(logs[0].money,undefined);assert.equal(expenseForMeal(logs,logs[0]),logs[2]);
 const state={...emptyState(),logs};assert.deepEqual(validateBackup(state).logs,logs);assert.deepEqual(unflattenState(flattenState(state)).logs,logs);assert.match(dayDocument(state,'2026-10-31'),/연결된 지출: 마트/);
 const unlinked=linkMealToExpense(logs,'meal',null);assert.equal(unlinked[0].expenseId,undefined);assert.equal(monthMoney(unlinked,'2026-10').totals.expense,30000);assert.equal(lunch.money.amount,9000);
 assert.throws(()=>linkMealToExpense(logs,'meal','missing'));assert.throws(()=>linkMealToExpense(logs,'meal','dinner'));
});
test('연결 식사를 편집해도 연결을 유지하고 새 지출을 명시한 경우에만 대체한다',()=>{
 const linked={...meal(),expenseId:'receipt'};delete linked.money;
 assert.equal(setMealExpense(linked,{...values,mealAmount:''}).expenseId,'receipt');
 assert.equal(setMealExpense(linked,values).expenseId,undefined);
 const bad={...emptyState(),logs:[{...linked,money:meal().money}]};assert.throws(()=>validateBackup(bad));
});
test('결제 시각은 가계부 CSV 왕복에서 보존하고 없는 시간은 만들지 않는다',()=>{
 const original=meal(),parsed=parseMoneyCSV(moneyCSV([original]),'2026-10-31').rows[0];assert.equal(parsed.time,'12:00');
 assert.equal(parseMoneyCSV('날짜,상호명,금액\n2026-10-31,카페,5800','2026-10-31').rows[0].time,undefined);
 assert.throws(()=>parseMoneyCSV('날짜,상호명,금액,거래시간\n2026-10-31,카페,5800,25:00','2026-10-31'));
});
