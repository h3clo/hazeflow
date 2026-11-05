// Extract only explicit product prices from saved order-detail text.
export function parseCoupangProductDetails(productText,paymentText){
 const number=s=>Number(s.replaceAll(',',''));
 const payment=String(paymentText).replace(/^(텍스트|text) /gm,'');
 const paid=payment.match(/총 결제금액\s*([\d,]+)\s*원/),shippingMatch=payment.match(/배송비\s*([\d,]+)\s*원/);
 if(!paid)return {rows:[],reason:'결제 합계 없음'};
 const total=number(paid[1]),shipping=shippingMatch?number(shippingMatch[1]):0,rows=[];
 for(const block of String(productText).split(/\n표\n/).slice(1)){
  const states=[...new Set([...block.matchAll(/(?:Value: |^text )(배송완료|반품완료|취소완료)/gm)].map(m=>m[1]))];
  let matches=[...block.matchAll(/\n([^\n]+)\n([\d,]+) 원\n(\d+)개(?=\n|$)/g)];
  if(!matches.length){const title=block.match(/^link (?!RDS_|ROCKET)(.+?), Value:/m),price=block.match(/^text ([\d,]+) 원 (\d+)개$/m);if(title&&price)matches=[[null,title[1],price[1],price[2]]];}
  // Free gifts have no paid price; they must not make unrelated paid items disappear.
  if(!matches.length&&/사은품/.test(block)&&/\n원\n\d+개/.test(block))continue;
  if(states.length!==1||!matches.length)return {rows:[],reason:'상품 상태·가격 확인 필요'};
  for(const m of matches)rows.push({name:m[1],price:number(m[2]),count:number(m[3]),state:states[0],split:block.includes('분리배송')});
 }
 const sum=rs=>rs.reduce((n,r)=>n+r.price*r.count,0),matches=rs=>sum(rs)===total||sum(rs)+shipping===total;
 let result=rows,deduped=false;
 if(!matches(result)){const seen=new Set(),unique=rows.filter(r=>{const key=JSON.stringify([r.name,r.price,r.count,r.state]);if(r.split&&seen.has(key))return false;if(r.split)seen.add(key);return true});if(unique.length<rows.length&&matches(unique)){result=unique;deduped=true;}}
 const cardDiscount=number(payment.match(/카드 즉시할인\s*-([\d,]+)\s*원/)?.[1]||'0');
 if(result.length===1&&result[0].count===1&&result[0].state==='배송완료'&&cardDiscount>0&&result[0].price-cardDiscount===total&&shipping===0){result=[{...result[0],listedPrice:result[0].price,price:total,cardDiscount}];}
 if(!result.length||!matches(result))return {rows:[],reason:'상품가격 합계와 결제금액 불일치',total,shipping};
 return {rows:result,total,shipping,deduped};
}
