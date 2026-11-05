// Naver's displayed product price is a line total, already discounted; do not multiply it by quantity.
export function parseNaverProductDetails(source){
 const text=String(source.productText||'');let names=source.itemNames?.length?source.itemNames:[...text.matchAll(/(?:^|\n)\d+ link 상품명 (.*?), Value:/g)].map(m=>m[1]);
 if((source.kind==='즉시결제'||/머리말 결제상품/.test(text))&&!source.hasRefundSection){const name=text.match(/^상품명 (.+)$/m)?.[1],prices=[...text.matchAll(/^상품가격 ([\d,]+)원$/gm)],quantity=text.match(/^(\d+)개$/m),amount=prices.length===1?Number(prices[0][1].replaceAll(',','')):0;if(name&&amount>0&&amount===source.total&&!/취소완료|반품완료|환불완료|취소요청중/.test(text))return {items:[{name,option:'',quantity:quantity?Number(quantity[1]):1,amount,sourceItemId:source.orderId}],total:source.total,shipping:0};}
 if(!Array.isArray(names)||source.hasRefundSection)return {items:[],reason:'상품명 또는 환불 내역 확인 필요'};
 let headers=[...text.matchAll(/^상품가격 ([\d,]+)원[^\n]*상품주문번호\s*:\s*(\d+)[^\n]*$/gm)];
 if(!headers.length&&names.length===1){const prices=[...text.matchAll(/^상품가격 ([\d,]+)원[^\n]*$/gm)],ids=[...text.matchAll(/^상품주문번호\s*:\s*(\d+)$/gm)];if(prices.length===1&&ids.length===1)headers=[{0:'',1:prices[0][1],2:ids[0][1],index:0}];}
 let namesFromOptions=false;
 if(!names.length&&headers.length){const options=headers.map((h,i)=>text.slice(h.index+h[0].length,headers[i+1]?.index??text.length).match(/^옵션 옵션명:\s*(.+)$/m)?.[1]);if(options.every(Boolean)){names=options;namesFromOptions=true;}}
 if(headers.length!==names.length||new Set(headers.map(m=>m[2])).size!==headers.length)return {items:[],reason:'상품 수·상품주문번호 대조 필요'};
 const items=[];for(let i=0;i<headers.length;i++){const h=headers[i],block=text.slice(h.index+h[0].length,headers[i+1]?.index??text.length),quantities=[...block.matchAll(/^(?:[^\n]*?\s)?(\d+)개(?:\s+\([+-][\d,]+원\))?\s*$/gm)],optionMatch=block.match(/^옵션(?: (.+)|\n([^\n]+))/m),option=optionMatch?.[1]||optionMatch?.[2]||'';
  if(/취소|반품|환불/.test(block.replace(/^\d+ 버튼 .*$/gm,''))||quantities.length!==1)return {items:[],reason:'배송 상태·수량 확인 필요'};
  const amount=Number(h[1].replaceAll(',','')),quantity=Number(quantities[0][1]);if(amount<=0||quantity<=0)return {items:[],reason:'무료 상품 또는 수량 확인 필요'};
  items.push({name:names[i],option:namesFromOptions?'':option,quantity,amount,sourceItemId:h[2]});
 }
 const sum=items.reduce((n,i)=>n+i.amount,0),payment=String(source.paymentText||''),shippingGross=Number(payment.match(/배송비\n([\d,]+)원/)?.[1].replaceAll(',','')||0),shippingDiscount=Number(payment.match(/배송비할인\n-([\d,]+)원/)?.[1].replaceAll(',','')||0),shipping=shippingGross-shippingDiscount;
 if(shipping<0)return {items:[],reason:'배송비 할인 확인 필요'};
 if(!Number.isSafeInteger(source.total)||source.total<=0||sum+shipping!==source.total)return {items:[],reason:'상품별 할인 후 금액과 주문 합계 불일치'};
 return {items,total:source.total,shipping};
}

export function parseNaverRetainedProductDetails(source,netTotal,refundText){
 const refund=Number(String(refundText||'').match(/환불금액\n총 ([\d,]+)원/)?.[1].replaceAll(',','')||0);
 if(!Number.isSafeInteger(netTotal)||netTotal<=0||!refund||source.total-refund!==netTotal)return {items:[],reason:'환불 후 지출 대조 필요'};
 const text=String(source.productText||''),names=source.itemNames||[],headers=[...text.matchAll(/^상품가격 ([\d,]+)원[^\n]*상품주문번호\s*:\s*(\d+)[^\n]*$/gm)];
 if(headers.length!==names.length||!headers.length)return {items:[],reason:'환불 주문의 상품별 정보 확인 필요'};
 const keep=[],keptNames=[];let removed=0;for(let i=0;i<headers.length;i++){const block=text.slice(headers[i].index,headers[i+1]?.index??text.length);if(/^(?:반품환불완료|반품완료|취소완료)\s*$/m.test(block)){removed++;continue;}keep.push(block);keptNames.push(names[i]);}
 if(!removed||!keep.length)return {items:[],reason:'남긴 상품 또는 완료된 반품 구분 필요'};
 return parseNaverProductDetails({...source,productText:text.slice(0,headers[0].index)+keep.join(''),itemNames:keptNames,total:netTotal,hasRefundSection:false});
}
