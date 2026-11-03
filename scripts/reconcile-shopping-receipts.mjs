import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {reconcileShoppingReceipts} from '../shopping-receipts.js';
const [folder,output,today]=process.argv.slice(2);
if(!folder||!output||!/^20\d\d-\d\d-\d\d$/.test(today||''))throw Error('사용법: node scripts/reconcile-shopping-receipts.mjs 원본폴더 결과폴더 YYYY-MM-DD');
const receipts=[];
for(const name of (await readdir(folder)).sort()){
 if(!/^쿠팡-20\d{2}-(?:카드|현금)영수증(?:-\d+)?\.json$/.test(name))continue;
 const d=JSON.parse(await readFile(path.join(folder,name),'utf8'));
 for(const row of d.rows||[])receipts.push({...row,platform:'쿠팡',method:name.includes('카드')?'카드':'현금영수증',sourceFile:name});
}
let cancellations=[],cancellationComplete=false;
try{const d=JSON.parse(await readFile(path.join(folder,'쿠팡-취소반품-확인페이지.json'),'utf8'));cancellationComplete=d.complete===true;for(const page of d.pages||[])for(const m of page.matchAll(/주문번호\s*:\s*(\d+)/g))cancellations.push({platform:'쿠팡',orderId:m[1]})}catch(e){if(e.code!=='ENOENT')throw e}
const audit=reconcileShoppingReceipts(receipts,{cancellations,today}),yearly={};
for(const row of audit.orders){const y=row.dates[0].slice(0,4);yearly[y]??={orders:0,receipts:0,receiptAmount:0};yearly[y].orders++;yearly[y].receipts+=row.receiptCount;yearly[y].receiptAmount+=row.receiptAmount}
await mkdir(output,{recursive:true,mode:0o700});
await writeFile(path.join(output,'쿠팡-영수증대조.json'),JSON.stringify({...audit,yearly,cancellationScope:{observedEntries:cancellations.length,complete:cancellationComplete},imported:false},null,2),{mode:0o600});
const report=`# 쿠팡 영수증 대조\n\n원본 영수증 ${audit.receiptCount}장 → 주문 ${audit.orderCount}건. 주문 단위로 묶었으며 기존 원본·가계부는 변경하지 않았습니다.\n\n|연도|주문|영수증|영수증 금액 합계|\n|---|---:|---:|---:|\n${Object.entries(yearly).map(([y,v])=>`|${y}|${v.orders}|${v.receipts}|${v.receiptAmount.toLocaleString('ko-KR')}원|`).join('\n')}\n\n이 합계는 확정 소비가 아닙니다. 현재 주문 상태·취소·환불 전체 대조 전이며 자동 가져오기는 하지 않았습니다.\n\n- 카드·현금영수증이 함께 있는 주문: ${audit.orders.filter(r=>r.methods.length>1).length}건\n- 영수증 날짜가 서로 다른 주문: ${audit.orders.filter(r=>r.dates.length>1).length}건\n- 확인한 취소·반품 ${cancellations.length}건 중 영수증과 일치하는 주문: ${audit.orders.filter(r=>r.cancellationMatches).length}건\n- 같은 영수증 번호의 확실한 중복 제거: ${audit.duplicateReceipts}장\n- 잘못된 형식: ${audit.invalid.length}장\n\n취소·반품 목록 전체 확인 여부: ${cancellationComplete?'확인':'미완료'}. 나머지 전체 조회와 카드·현금의 아직 수집하지 않은 과거 연도는 별도로 남아 있습니다. 상품별 금액·수량은 주문 총액으로 추정하지 않았습니다.\n`;
await writeFile(path.join(output,'쿠팡-대조결과.md'),report,{mode:0o600});
console.log(JSON.stringify({receipts:audit.receiptCount,orders:audit.orderCount,yearly,cancellationMatches:audit.orders.filter(r=>r.cancellationMatches).length,imported:false}));
