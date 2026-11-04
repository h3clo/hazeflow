import {validMoney} from './money.js';
export function mealExpense(values){
 if(values.mealAmount==null||String(values.mealAmount).trim()==='')return undefined;
 if(values.kind!=='식사')throw Error('지출을 함께 남기려면 식사 분류를 선택해주세요. 지출 금액을 비우면 연결을 해제할 수 있어요.');
 const money={type:'expense',amount:Number(values.mealAmount),currency:'KRW',merchant:String(values.mealMerchant||'').trim()||String(values.text||'').trim().split('\n')[0].slice(0,80)||'식사',category:String(values.mealCategory||'').trim()||'식비',payment:values.splits?'복합 결제':values.mealPayment==='복합 결제'?'':String(values.mealPayment||'').trim(),...(values.splits?{splits:values.splits}:{}),...(values.scope!==undefined?{scope:values.scope}:{}),...(values.payer!==undefined?{payer:String(values.payer).trim()}:{})};
 if(!validMoney(money))throw Error('식사 지출은 1원 이상의 정수 금액으로 적어주세요.');return money;
}
export function setMealExpense(record,values){const result={...record},money=mealExpense({...values,...Object.fromEntries(['scope','payer'].filter(k=>values[k]===undefined&&record.money?.[k]!==undefined).map(k=>[k,record.money[k]]))});if(money){result.money=money;delete result.expenseId;}else delete result.money;return result;}
export function unlinkMealExpense(record){if(record.kind!=='식사')throw Error('연결된 식사 기록이 아니에요.');const result={...record};delete result.money;delete result.expenseId;return result;}

export function expenseForMeal(logs,meal){return meal?.expenseId?logs.find(l=>l.id===meal.expenseId&&l.id!==meal.id&&l.kind!=='식사'&&l.money?.type==='expense'&&validMoney(l.money)):undefined;}
export function linkMealToExpense(logs,mealId,expenseId){
 const meal=logs.find(l=>l.id===mealId);if(!meal||meal.kind!=='식사')throw Error('식사 기록을 다시 확인해주세요.');
 const result={...meal};
 if(expenseId){const expense=expenseForMeal(logs,{...meal,expenseId});if(!expense)throw Error('연결할 지출이 삭제되었거나 변경됐어요.');result.expenseId=expense.id;delete result.money;}
 else delete result.expenseId;
 return logs.map(l=>l.id===mealId?result:l);
}
