import {validPurchaseItems} from './purchase-analysis.js';
import {receiptSuggestion,scanDate} from './scan-text.js';
export const shoppingPlatforms=['네이버','쿠팡','11번가','지그재그','G마켓','오늘의집','기타 쇼핑몰'];
export function validOrder(order,total=1e12){return order===undefined||!!order&&typeof order==='object'&&!Array.isArray(order)&&shoppingPlatforms.includes(order.platform)&&typeof order.id==='string'&&order.id.length<=100&&typeof order.item==='string'&&order.item.length<=300&&validPurchaseItems(order.items,total)&&(order.aliases===undefined||Array.isArray(order.aliases)&&order.aliases.length<=10&&order.aliases.every(a=>a&&shoppingPlatforms.includes(a.platform)&&a.platform!==order.platform&&typeof a.id==='string'&&a.id.trim()&&a.id.length<=100)&&new Set(order.aliases.map(a=>JSON.stringify([a.platform,a.id]))).size===order.aliases.length)}
export function shoppingSuggestion(raw,platform){if(!shoppingPlatforms.includes(platform)||String(raw).length>50000)throw Error('쇼핑몰과 주문 내용을 확인해주세요.');const text=String(raw),lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),r=receiptSuggestion(text),order=text.match(/주문\s*(?:번호|번호\s*조회)\s*[:：#]?\s*([A-Za-z0-9][A-Za-z0-9_-]{3,99})/),item=lines.find(l=>/^상품명\s*[:：]/.test(l));return {date:scanDate(text),time:r.values.time||'',amount:r.values.amount||'',payment:r.values.payment||'',merchant:platform,order:{platform,id:order?.[1]||'',item:item?item.replace(/^상품명\s*[:：]\s*/,'').slice(0,300):''},warnings:[...r.warnings,...(!r.values.amount?['확실한 결제 합계를 찾지 못했어요. 할인·포인트 적용 후 실제 결제 금액을 확인해주세요.']:[])],blocked:/취소\s*완료|환불\s*완료|전체\s*취소/.test(text)}}
export function duplicateOrder(logs,money,date){if(money.order?.id){const exact=logs.find(l=>shoppingOrderMatches(l.money?.order,money.order));if(exact)return exact;}return logs.find(l=>(!money.order?.id||!l.money?.order?.id)&&l.date===date&&l.money?.type===money.type&&l.money?.merchant===money.merchant&&l.money?.amount===money.amount)||null}

export function crossSourceOrderCandidates(logs,money,date){if(!['네이버','오늘의집'].includes(money.order?.platform))return [];return logs.filter(l=>l.money?.type==='expense'&&l.date===date&&l.money.amount===money.amount&&(l.money.currency||'KRW')===(money.currency||'KRW')&&l.money.order?.platform!==money.order.platform&&((money.order.platform==='오늘의집'&&l.money.order?.platform==='네이버')||(money.order.platform==='네이버'&&l.money.order?.platform==='오늘의집')));}

export function shoppingOrderMatches(existing,source){return !!source?.id&&!!existing&&((existing.platform===source.platform&&existing.id===source.id)||(existing.aliases||[]).some(a=>a.platform===source.platform&&a.id===source.id));}
export const shoppingLinkSnapshot=log=>JSON.stringify([log.date,log.money.type,log.money.currency,log.money.amount,log.money.order]);
export function linkShoppingOrder(logs,{id,before,date,money}){
 const target=logs.find(l=>l.id===id);
 if(!target?.money?.order||shoppingLinkSnapshot(target)!==before)throw Error('기존 결제가 바뀌었어요. 읽은 값을 다시 확인해주세요.');
 if(!crossSourceOrderCandidates([target],money,date).length||!money.order?.id?.trim()||!validOrder(money.order,money.amount))throw Error('날짜·금액·쇼핑몰·주문번호가 맞는 결제만 연결할 수 있어요.');
 const duplicate=duplicateOrder(logs,money,date);if(duplicate&&duplicate.id!==target.id)throw Error('이미 다른 결제에 연결된 주문번호예요.');
 if(shoppingOrderMatches(target.money.order,money.order))return false;
 const order={...target.money.order,aliases:[...(target.money.order.aliases||[]),{platform:money.order.platform,id:money.order.id}]};
 if(!validOrder(order,target.money.amount))throw Error('연결 가능한 주문번호는 최대 10개예요.');target.money.order=order;return true;
}
