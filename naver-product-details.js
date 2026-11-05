// Naver's displayed product price is a line total, already discounted; do not multiply it by quantity.
export function parseNaverProductDetails(source){
 const text=String(source.productText||''),names=source.itemNames?.length?source.itemNames:[...text.matchAll(/(?:^|\n)\d+ link 상품명 (.*?), Value:/g)].map(m=>m[1]);
 if((source.kind==='즉시결제'||/머리말 결제상품/.test(text))&&!source.hasRefundSection){const name=text.match(/^상품명 (.+)$/m)?.[1],prices=[...text.matchAll(/^상품가격 ([\d,]+)원$/gm)],quantity=text.match(/^(\d+)개$/m),amount=prices.length===1?Number(prices[0][1].replaceAll(',','')):0;if(name&&amount>0&&amount===source.total&&!/취소완료|반품완료|환불완료|취소요청중/.test(text))return {items:[{name,option:'',quantity:quantity?Number(quantity[1]):1,amount,sourceItemId:source.orderId}],total:source.total,shipping:0};}
 if(!Array.isArray(names)||!names.length||source.hasRefundSection)return {items:[],reason:'상품명 또는 환불 내역 확인 필요'};
 const headers=[...text.matchAll(/^상품가격 ([\d,]+)원[^\n]*상품주문번호\s*:\s*(\d+)[^\n]*$/gm)];
 if(headers.length!==names.length||new Set(headers.map(m=>m[2])).size!==headers.length)return {items:[],reason:'상품 수·상품주문번호 대조 필요'};
 const items=[];for(let i=0;i<headers.length;i++){const h=headers[i],block=text.slice(h.index+h[0].length,headers[i+1]?.index??text.length),quantities=[...block.matchAll(/^(?:[^\n]*?\s)?(\d+)개$/gm)],option=block.match(/^옵션 (.+)$/m)?.[1]||'';
  if(/취소|반품|환불/.test(block.replace(/^\d+ 버튼 .*$/gm,''))||quantities.length!==1)return {items:[],reason:'배송 상태·수량 확인 필요'};
  const amount=Number(h[1].replaceAll(',','')),quantity=Number(quantities[0][1]);if(amount<=0||quantity<=0)return {items:[],reason:'무료 상품 또는 수량 확인 필요'};
  items.push({name:names[i],option,quantity,amount,sourceItemId:h[2]});
 }
 const sum=items.reduce((n,i)=>n+i.amount,0),payment=String(source.paymentText||''),shipping=Number(payment.match(/배송비\n([\d,]+)원/)?.[1].replaceAll(',','')||0);
 if(!Number.isSafeInteger(source.total)||source.total<=0||sum+shipping!==source.total)return {items:[],reason:'상품별 할인 후 금액과 주문 합계 불일치'};
 return {items,total:source.total,shipping};
}
