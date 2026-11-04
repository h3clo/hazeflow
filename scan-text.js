export function scanDate(text){const m=String(text).match(/\b(20\d{2})[./-]\s*(\d{1,2})[./-]\s*(\d{1,2})\b/);if(!m)return '';const date=m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0'),d=new Date(date+'T12:00:00');return d.getFullYear()===+m[1]&&d.getMonth()+1===+m[2]&&d.getDate()===+m[3]?date:''}
const linesOf=text=>String(text).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
export function receiptSuggestion(text){const lines=linesOf(text),candidates=[];for(const line of lines){const compact=line.replace(/\s/g,'');if(/할인|포인트|잔액|부가세|공급가|subtotal|change|balance/i.test(compact))continue;const score=/총결제|결제금액|승인금액|받을금액|grandtotal|totalamount|amountdue/i.test(compact)?3:/합계|^total(?:[^a-z]|$)|총액/i.test(compact)?2:0;if(!score)continue;const amounts=[...line.matchAll(/\b\d[\d,.]*\b/g)].filter(m=>/^(?:\d{3,}|\d{1,3}(?:,\d{3})+|\d{3,}\.00)$/.test(m[0])).map(m=>Number(m[0].replace(/,/g,''))).filter(n=>Number.isSafeInteger(n)&&n>0&&n<=1e12);if(new Set(amounts).size===1)candidates.push({amount:amounts[0],score,line})}
 const max=Math.max(0,...candidates.map(c=>c.score)),best=[...new Set(candidates.filter(c=>c.score===max).map(c=>c.amount))];const merchantLine=lines.find(l=>/^(?:상\s*호(?:\s*명)?|매장명|가맹점명|merchant|store)\s*[:：]/i.test(l));const merchant=merchantLine?merchantLine.replace(/^[^:：]+[:：]\s*/,'').slice(0,200):'';const card=/신용|체크|카드|credit|visa|mastercard/i.test(text),cash=/현금|cash/i.test(text);
 const foreign=/(?:\b(?:USD|PHP|EUR|JPY|CNY|HKD|AUD|CAD|GBP)\b|[$€£¥₱])/i.test(text),refund=/취소|환불|refund|cancelled/i.test(text);return {values:{date:receiptDate(text),time:receiptTime(text),merchant,amount:best.length===1&&!foreign&&!refund?String(best[0]):'',payment:card&&!cash?'카드':cash&&!card?'현금':''},candidates,warnings:[...(best.length>1?['합계 금액이 여러 개로 읽혀 자동 선택하지 않았어요.']:[]),...(foreign?['외화 표시가 있어 원화 금액을 자동으로 채우지 않아요.']:[]),...(refund?['취소·환불 표시가 있어 금액을 자동으로 채우지 않아요.']:[])]};}
export function bodySuggestion(text){const lines=linesOf(text),values={};const definitions=[['weight',/체\s*중|body\s*weight|\bweight\b/i,500],['muscle',/골\s*격\s*근\s*량|skeletal\s*muscle(?:\s*mass)?|\bsmm\b/i,200],['fatPercent',/체\s*지\s*방\s*률|percent\s*body\s*fat|body\s*fat\s*(?:percentage|percent)|\bpbf\b/i,100],['fat',/체\s*지\s*방\s*량|body\s*fat\s*mass/i,500]];
 for(const [key,pattern,max]of definitions){const found=[];lines.forEach((line,i)=>{const m=pattern.exec(line);if(!m)return;let tail=line.slice(m.index+m[0].length).replace(/^(?:\s*\([^)]{0,30}\)\s*)+/,'');if(!/\d/.test(tail)&&/^\s*\d+(?:\.\d+)?\s*(?:kg|%)?\s*$/i.test(lines[i+1]||''))tail=lines[i+1];const n=tail.match(/\d+(?:\.\d+)?/);if(n&&!/[A-Za-z0-9.,-]/.test(tail[n.index-1]||'')&&!/^(?:\s*[~～-]|,\d|[A-JL-Za-jl-z])/.test(tail.slice(n.index+n[0].length))&&+n[0]>=0&&+n[0]<=max)found.push(String(+n[0]))});if(new Set(found).size===1)values[key]=found[0];}
 return {values:{date:scanDate(text),...values},warnings:[]};}

export function receiptTime(text){
 const candidates=[];
 for(const line of linesOf(text)){
  if(/출력|인쇄|영업시간|재발행|print|opening/i.test(line))continue;
  const labelled=/(?:승인|거래|결제|매출)\s*(?:일시|시간)/.test(line),dated=!!scanDate(line);
  for(const m of line.matchAll(/(?:^|[^\d])(오전|오후|AM|PM)?\s*(\d{1,2})\s*:\s*(\d{2})(?:\s*:\s*(\d{2}))?\s*(AM|PM)?(?!\d)/gi)){
   let h=Number(m[2]);const minute=Number(m[3]),second=Number(m[4]||0),period=(m[1]||m[5]||'').toLowerCase();
   if(minute>59||second>59||h>23||(period&&(h<1||h>12)))continue;
   if(period)h=h%12+(['오후','pm'].includes(period)?12:0);
   if(!labelled&&!dated&&!/^\s*(?:(?:오전|오후|am|pm)\s*)?\d{1,2}\s*:\s*\d{2}(?:\s*:\s*\d{2})?\s*$/i.test(line))continue;
   candidates.push({time:String(h).padStart(2,'0')+':'+m[3],score:labelled?3:dated?2:1});
  }
 }
 const max=Math.max(0,...candidates.map(x=>x.score)),times=[...new Set(candidates.filter(x=>x.score===max).map(x=>x.time))];return times.length===1?times[0]:'';
}

export function receiptDate(text){
 const candidates=linesOf(text).filter(line=>!/출력|인쇄|재발행|유효|만료|생년|print|expir/i.test(line)).map(line=>({date:scanDate(line),score:/(?:승인|거래|결제|매출)\s*(?:일시|일자|일|시간)/.test(line)?2:1})).filter(x=>x.date);
 const max=Math.max(0,...candidates.map(x=>x.score)),dates=[...new Set(candidates.filter(x=>x.score===max).map(x=>x.date))];return dates.length===1?dates[0]:'';
}
