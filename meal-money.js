import {validMoney} from './money.js';
export function mealExpense(values){
 if(values.mealAmount==null||String(values.mealAmount).trim()==='')return undefined;
 if(values.kind!=='식사')throw Error('지출을 함께 남기려면 식사 분류를 선택해주세요. 지출 금액을 비우면 연결을 해제할 수 있어요.');
 const money={type:'expense',amount:Number(values.mealAmount),currency:'KRW',merchant:String(values.mealMerchant||'').trim()||String(values.text||'').trim().split('\n')[0].slice(0,80)||'식사',category:String(values.mealCategory||'').trim()||'식비',payment:String(values.mealPayment||'').trim()};
 if(!validMoney(money))throw Error('식사 지출은 1원 이상의 정수 금액으로 적어주세요.');return money;
}
export function setMealExpense(record,values){const result={...record},money=mealExpense(values);if(money)result.money=money;else delete result.money;return result;}
export function unlinkMealExpense(record){if(record.kind!=='식사')throw Error('연결된 식사 기록이 아니에요.');const result={...record};delete result.money;return result;}
