#!/usr/bin/env node
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {validPurchaseItems} from '../purchase-analysis.js';
import {validOrderCharges} from '../order-charges.js';

/**
 * Reconcile collected Naver orders against card/household transactions.
 * Usage:
 *   node scripts/reconcile-naver-orders.mjs <naver-orders.json|csv> <transactions.csv|json> <output-dir>
 */

function parseCSVLine(line){
 const res=[];let cur='',inQuote=false;
 for(let i=0;i<line.length;i++){
  const c=line[i];
  if(c==='"'){
   if(inQuote&&line[i+1]==='"'){cur+='"';i++;}
   else{inQuote=!inQuote;}
  }else if(c===','&&!inQuote){
   res.push(cur.trim());cur='';
  }else{
   cur+=c;
  }
 }
 res.push(cur.trim());
 return res;
}

export function parseTransactionRecords(text){
 if(text.trim().startsWith('{')){
  const d=JSON.parse(text);
  if(Array.isArray(d.logs)){
   return d.logs.filter(l=>l.money&&l.money.type==='expense').map(l=>({
    id: l.id,
    date: l.date,
    amount: l.money.amount,
    merchant: l.money.merchant||'',
    platform: l.money.order?.platform||'',
    orderId: l.money.order?.id||'',
    items: l.money.order?.items||[],
    charges: l.money.order?.charges
   }));
  }
 }
 // CSV parsing
 const lines=text.split(/\r?\n/).filter(Boolean);
 if(!lines.length) return [];
 const headers=parseCSVLine(lines[0]).map(h=>h.replace(/^\uFEFF/,'').trim());
 const dateIdx=headers.findIndex(h=>/날짜|거래일|결제일|date/i.test(h));
 const amountIdx=headers.findIndex(h=>/금액|결제금액|amount/i.test(h));
 const merchantIdx=headers.findIndex(h=>/상호명|거래처|가맹점|merchant/i.test(h));
 const orderIdIdx=headers.findIndex(h=>/주문번호|orderid/i.test(h));
 const platformIdx=headers.findIndex(h=>/쇼핑몰|platform/i.test(h));

 const rows=[];
 for(let i=1;i<lines.length;i++){
  const cols=parseCSVLine(lines[i]);
  const date=dateIdx>=0?cols[dateIdx]:'';
  const rawAmount=amountIdx>=0?cols[amountIdx].replace(/[^\d]/g,''):'0';
  const amount=Number(rawAmount);
  const merchant=merchantIdx>=0?cols[merchantIdx]:'';
  const orderId=orderIdIdx>=0?cols[orderIdIdx]:'';
  const platform=platformIdx>=0?cols[platformIdx]:'';
  if(date&&amount>0){
   rows.push({
    id: `tx-${i}`,
    date,
    amount,
    merchant,
    platform,
    orderId
   });
  }
 }
 return rows;
}

export function parseCollectedNaverOrders(text){
 if(text.trim().startsWith('{')){
  const d=JSON.parse(text);
  if(d.type==='hazeflow-purchase-proposals'&&Array.isArray(d.proposals)){
   return d.proposals.map(p=>({
    orderId: p.orderId||p.id,
    date: p.date,
    total: p.expectedAmount,
    firstItem: p.expectedOrderItem||p.items?.[0]?.name||'',
    items: p.items||[],
    charges: p.charges||{},
    isCancelled: false
   }));
  }
 }
 // CSV
 const lines=text.split(/\r?\n/).filter(Boolean);
 const rows=[];
 for(let i=1;i<lines.length;i++){
  const cols=parseCSVLine(lines[i]);
  if(cols.length>=5){
   const date=cols[0];
   const orderId=cols[2];
   const item=cols[3];
   const amount=Number(cols[4].replace(/[^\d]/g,''));
   const status=cols[6]||'';
   if(date&&orderId&&amount>0){
    rows.push({
     orderId,
     date,
     total: amount,
     firstItem: item,
     items: [{
      name: item,
      family: item.slice(0, 40),
      category: '생활용품',
      quantity: 1,
      unit: '개',
      amount
     }],
     charges: {},
     isCancelled: /취소|환불|반품/.test(status)
    });
   }
  }
 }
 return rows;
}

export function reconcileOrdersWithTransactions(orders, transactions){
 const existingOrderIds=new Set(transactions.map(t=>t.orderId).filter(Boolean));
 const alreadyEnriched=new Set(transactions.filter(t=>t.orderId&&(t.items?.length||t.charges)).map(t=>t.orderId));

 const matched=[];
 const skippedExisting=[];
 const skippedCancelled=[];
 const unmatched=[];

 // Index transactions by date
 const txByDate=new Map();
 for(const tx of transactions){
  if(!txByDate.has(tx.date)) txByDate.set(tx.date, []);
  txByDate.get(tx.date).push(tx);
 }

 const isNaverMerchant=m=>/네이버|naver/i.test(m);

 for(const ord of orders){
  if(ord.isCancelled){
   skippedCancelled.push({order: ord, reason: '취소/환불 완료 거래'});
   continue;
  }
  if(alreadyEnriched.has(ord.orderId)){
   skippedExisting.push({order: ord, reason: '이미 상품 정보가 정리되어 있음'});
   continue;
  }

  // 1. Direct match by orderId
  const directTx=transactions.find(t=>t.orderId===ord.orderId);
  if(directTx){
   matched.push({
    transactionId: directTx.id,
    order: ord,
    method: '주문번호 직접 일치'
   });
   continue;
  }

  // 2. Search by Date (exact or +/- 1 day) and Amount
  const candidateDates=[ord.date];
  try{
   const d=new Date(ord.date+'T12:00:00Z');
   const prev=new Date(d.getTime()-86400000).toISOString().slice(0,10);
   const next=new Date(d.getTime()+86400000).toISOString().slice(0,10);
   candidateDates.push(prev, next);
  }catch{}

  let foundTx=null;
  for(const dt of candidateDates){
   const candidates=(txByDate.get(dt)||[]).filter(t=>t.amount===ord.total&&(!t.orderId||t.orderId===ord.orderId)&&(!t.merchant||isNaverMerchant(t.merchant)));
   if(candidates.length===1){
    foundTx=candidates[0];
    break;
   }
  }

  if(foundTx){
   matched.push({
    transactionId: foundTx.id,
    order: ord,
    method: foundTx.date===ord.date ? '날짜·금액 일치' : '결제일 오차(±1일)·금액 일치'
   });
  }else{
   unmatched.push({
    order: ord,
    reason: '일치하는 카드/가계부 결제 내역 없음 (날짜/금액 불일치 또는 미등록)'
   });
  }
 }

 return {
  matched,
  skippedExisting,
  skippedCancelled,
  unmatched
 };
}

async function main(){
 const [ordersFile, txFile, outDir]=process.argv.slice(2);
 if(!ordersFile||!txFile||!outDir){
  console.log('사용법: node scripts/reconcile-naver-orders.mjs <네이버수집파일.json/csv> <가계부/카드거래.csv/json> <출력폴더>');
  process.exit(1);
 }

 const ordersText=await readFile(ordersFile, 'utf8');
 const txText=await readFile(txFile, 'utf8');

 const orders=parseCollectedNaverOrders(ordersText);
 const transactions=parseTransactionRecords(txText);

 const result=reconcileOrdersWithTransactions(orders, transactions);

 await mkdir(outDir, {recursive: true});

 // Build proposals
 const proposals=result.matched.map(m=>({
  id: m.transactionId.startsWith('tx-') ? m.order.orderId : m.transactionId,
  date: m.order.date,
  platform: '네이버',
  orderId: m.order.orderId,
  expectedOrderItem: m.order.firstItem||m.order.items[0]?.name||'상품',
  expectedAmount: m.order.total,
  items: m.order.items,
  ...(Object.keys(m.order.charges||{}).length?{charges: m.order.charges}:{})
 }));

 const proposalsFile={
  type: 'hazeflow-purchase-proposals',
  version: 1,
  proposals
 };

 const jsonPath=path.join(outDir, 'hazeflow-purchase-proposals.json');
 await writeFile(jsonPath, JSON.stringify(proposalsFile, null, 2), 'utf8');

 // Build Markdown Report
 const report=`# 네이버 쇼핑 주문 자동 대조 리포트

- **수집된 주문 수:** ${orders.length}건
- **비교 대상 거래 수:** ${transactions.length}건
- **자동 매칭 성공:** ${result.matched.length}건 (→ \`hazeflow-purchase-proposals.json\` 생성 완료)
- **이미 완료되어 건너뜀:** ${result.skippedExisting.length}건
- **취소/환불로 제외:** ${result.skippedCancelled.length}건
- **확인 필요(미매칭):** ${result.unmatched.length}건

## 확인 필요 내역 (사람/AI 검토 대상)
${result.unmatched.length ? result.unmatched.map(u=>`- [${u.order.date}] ${u.order.orderId}: ${u.order.total.toLocaleString('ko-KR')}원 (${u.order.firstItem}) · 사유: ${u.reason}`).join('\n') : '없음 (모든 거래가 정상 매칭됨)'}
`;

 const mdPath=path.join(outDir, '네이버-대조결과-리포트.md');
 await writeFile(mdPath, report, 'utf8');

 console.log(JSON.stringify({
  orders: orders.length,
  matched: result.matched.length,
  skippedExisting: result.skippedExisting.length,
  skippedCancelled: result.skippedCancelled.length,
  unmatched: result.unmatched.length,
  proposalsPath: jsonPath,
  reportPath: mdPath
 }, null, 2));
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 main().catch(err=>{
  console.error('오류:', err);
  process.exit(1);
 });
}
