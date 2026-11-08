import {moneyFingerprint,validMoney,moneyTypes} from './money.js';
import {expenseForMeal} from './meal-money.js';

function softKey(l){return JSON.stringify([l.date,l.money?.type,l.money?.amount])}

/**
 * Read-only scan of existing money-related logs.
 * Never mutates logs. Findings are candidates / warnings, not confirmed fixes.
 */
export function diagnoseMoneyLogs(logs=[]){
 const findings=[];
 const withMoney=logs.filter(l=>l?.money);
 const byFingerprint=new Map();
 const byOrder=new Map();
 const bySoft=new Map();

 for(const l of withMoney){
  if(!validMoney(l.money)){
   findings.push({kind:'invalid',severity:'high',id:l.id,date:l.date,message:'금액·상호·통화 형식이 검증을 통과하지 않아요.',detail:l.money?.merchant||''});
   continue;
  }
  const fp=moneyFingerprint(l);
  if(!byFingerprint.has(fp))byFingerprint.set(fp,[]);
  byFingerprint.get(fp).push(l);
  const soft=softKey(l);
  if(!bySoft.has(soft))bySoft.set(soft,[]);
  bySoft.get(soft).push(l);
  if(l.money.order?.id){
   const key=JSON.stringify([l.money.order.platform,l.money.order.id]);
   if(!byOrder.has(key))byOrder.set(key,[]);
   byOrder.get(key).push(l);
   for(const a of l.money.order.aliases||[]){
    const ak=JSON.stringify([a.platform,a.id]);
    if(!byOrder.has(ak))byOrder.set(ak,[]);
    byOrder.get(ak).push(l);
   }
  }
 }

 for(const [,group] of byFingerprint){
  if(group.length<2)continue;
  findings.push({
   kind:'duplicate',severity:'medium',ids:group.map(l=>l.id),date:group[0].date,
   message:`완전히 같은 거래 후보 ${group.length}건이 있어요.`,
   detail:`${group[0].money.merchant} · ${group[0].money.amount.toLocaleString('ko-KR')}원`
  });
 }

 for(const [key,group] of byOrder){
  const unique=new Map(group.map(l=>[l.id,l]));
  if(unique.size<2)continue;
  const [platform,id]=JSON.parse(key);
  findings.push({
   kind:'order-collision',severity:'medium',ids:[...unique.keys()],date:[...unique.values()][0].date,
   message:'같은 쇼핑몰·주문번호가 여러 기록에 연결되어 있어요.',
   detail:`${platform} · ${id}`
  });
 }

 for(const [,group] of bySoft){
  if(group.length<2)continue;
  const fps=new Set(group.map(moneyFingerprint));
  if(fps.size===1)continue; // already reported as exact duplicate
  findings.push({
   kind:'same-day-amount',severity:'low',ids:group.map(l=>l.id),date:group[0].date,
   message:`같은 날짜·유형·금액의 다른 거래 ${group.length}건이에요. 복수 증빙일 수 있어요.`,
   detail:group.map(l=>l.money.merchant).join(' · ')
  });
 }

 for(const meal of logs.filter(l=>l.kind==='식사')){
  if(meal.expenseId&&meal.money){
   findings.push({kind:'meal-link',severity:'high',id:meal.id,date:meal.date,message:'식사에 지출 연결과 자체 금액이 함께 있어요.',detail:meal.text?.slice(0,80)||''});
  }
  if(meal.expenseId&&!expenseForMeal(logs,meal)){
   findings.push({kind:'meal-orphan',severity:'high',id:meal.id,date:meal.date,message:'연결된 지출을 찾을 수 없어요.',detail:meal.expenseId});
  }
 }

 for(const l of withMoney){
  if(!l.money?.order)continue;
  if(!l.money.order.id&&(l.money.order.items?.length||l.money.order.aliases?.length||l.money.order.charges)){
   findings.push({kind:'order-incomplete',severity:'low',id:l.id,date:l.date,message:'주문 상세는 있는데 주문번호가 비어 있어요.',detail:l.money.order.platform||''});
  }
 }

 const severity={high:0,medium:1,low:2};
 findings.sort((a,b)=>severity[a.severity]-severity[b.severity]||String(a.date).localeCompare(String(b.date)));
 return {
  scanned:logs.length,
  moneyRows:withMoney.length,
  findings,
  summary:{
   high:findings.filter(f=>f.severity==='high').length,
   medium:findings.filter(f=>f.severity==='medium').length,
   low:findings.filter(f=>f.severity==='low').length
  }
 };
}

export function moneyDiagnoseReportHtml(report,{esc}={esc:v=>String(v??'')}){
 const labels={invalid:'형식',duplicate:'중복 후보','order-collision':'주문 충돌','same-day-amount':'같은 날·금액','meal-link':'식사 연결','meal-orphan':'끊긴 연결','order-incomplete':'주문 미완'};
 if(!report.findings.length)return `<p class="hint">지금 구조에서 눈에 띄는 누락·중복·연결 후보가 없어요. 이 결과는 확정이 아니며 기록을 바꾸지 않았어요.</p>`;
 return `<p>검사 ${report.scanned}건 · 금액 있는 기록 ${report.moneyRows}건 · 높음 ${report.summary.high} · 중간 ${report.summary.medium} · 낮음 ${report.summary.low}</p><p class="hint">후보는 자동으로 고치지 않아요. 필요하면 해당 거래를 직접 열어 확인해주세요.</p><div class="table-scroll"><table class="feature-table"><thead><tr><th>심각도</th><th>종류</th><th>날짜</th><th>설명</th></tr></thead><tbody>${report.findings.map(f=>`<tr><td>${esc(f.severity)}</td><td>${esc(labels[f.kind]||f.kind)}</td><td>${esc(f.date||'—')}</td><td>${esc(f.message)}${f.detail?`<br><small>${esc(f.detail)}</small>`:''}</td></tr>`).join('')}</tbody></table></div>`;
}

export {moneyTypes};
