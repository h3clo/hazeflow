import {shoppingDate} from './shopping-table.js';

// A receipt proves a payment record, not that an order was never returned.
// Repeated identical rows without a receipt ID must remain ambiguous: two
// sellers may issue equal-value receipts for the same order.
export function reconcileShoppingReceipts(receipts,{cancellations=[],today}={}){
 if(!Array.isArray(receipts)||receipts.length>10000)throw Error('영수증은 최대 10,000건까지 대조할 수 있어요.');
 const groups=new Map(),invalid=[];
 for(const [index,r] of receipts.entries()){
  const platform=String(r?.platform||'').trim(),orderId=String(r?.orderId||'').trim(),date=shoppingDate(r?.date),method=String(r?.method||'').trim();
  if(!platform||!orderId||!date||today&&date>today||!Number.isSafeInteger(r?.amount)||r.amount<=0||r.amount>1e12||!method){invalid.push({index,reason:'쇼핑몰·주문번호·날짜·결제수단·양의 정수 금액 확인 필요'});continue}
  const key=JSON.stringify([platform,orderId]),g=groups.get(key)||{platform,orderId,receipts:[],issues:[]};
  g.receipts.push({date,amount:r.amount,item:String(r.item||''),method,receiptId:String(r.receiptId||''),sourceFile:String(r.sourceFile||'')});groups.set(key,g);
 }
 const orders=[];
 for(const g of groups.values()){
  const receiptIds=new Map(),anonymous=new Set(),kept=[];let duplicateReceipts=0;
  for(const r of g.receipts){
   const signature=JSON.stringify([r.date,r.amount,r.item,r.method]);
   if(r.receiptId){const key=JSON.stringify([r.method,r.receiptId]),old=receiptIds.get(key);if(old){if(old===signature){duplicateReceipts++;continue}g.issues.push('같은 영수증 번호의 내용 불일치')}else receiptIds.set(key,signature)}
   else if(anonymous.has(signature))g.issues.push('영수증 번호 없는 동일 행 · 중복 또는 다른 판매자 확인 필요');else anonymous.add(signature);
   kept.push(r);
  }
  const dates=[...new Set(kept.map(r=>r.date))],methods=[...new Set(kept.map(r=>r.method))],receiptAmount=kept.reduce((n,r)=>n+r.amount,0);
  if(dates.length!==1)g.issues.push('같은 주문의 영수증 날짜 불일치');
  if(methods.length>1)g.issues.push('카드·현금영수증 중복 또는 복합결제 대조 필요');
  if(!Number.isSafeInteger(receiptAmount)||receiptAmount>1e12)g.issues.push('영수증 합계 범위 초과');
  const flags=cancellations.filter(r=>r.platform===g.platform&&String(r.orderId)===g.orderId);
  if(flags.length)g.issues.push('취소·반품 목록과 일치 · 일부 취소 여부와 실제 환급액 확인 필요');
  g.issues.push('현재 주문 상태·취소·환불 전체 대조 전');
  orders.push({platform:g.platform,orderId:g.orderId,dates,receiptAmount,receiptCount:kept.length,duplicateReceipts,methods,items:[...new Set(kept.map(r=>r.item).filter(Boolean))],issues:[...new Set(g.issues)],cancellationMatches:flags.length,importable:false});
 }
 orders.sort((a,b)=>(a.dates[0]||'').localeCompare(b.dates[0]||'')||a.orderId.localeCompare(b.orderId));
 return {receiptCount:receipts.length,orderCount:orders.length,duplicateReceipts:orders.reduce((n,r)=>n+r.duplicateReceipts,0),invalid,orders};
}
