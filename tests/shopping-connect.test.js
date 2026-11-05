import test from 'node:test';
import assert from 'node:assert/strict';
import {shoppingGrid,detectShoppingColumns,normalizeShoppingGrid,planShoppingRows,canonicalShoppingPlatform} from '../shopping-table.js';
import {parseOrderBlocks,shoppingBookmarklet} from '../shopping-extractor.js';
const today='2026-11-02';
const headers=['주문일','쇼핑몰','주문번호','상품명','결제금액','상태','금액근거','통화'];
const normalize=data=>normalizeShoppingGrid([headers,...data],detectShoppingColumns(headers),'네이버',today);
test('다섯 쇼핑몰의 CSV·TSV와 날짜·원화 열을 읽는다',()=>{
 assert.equal(canonicalShoppingPlatform('지마켓'),'G마켓');assert.equal(canonicalShoppingPlatform('zigzag'),'지그재그');
 const grid=shoppingGrid('\uFEFF주문일\t쇼핑몰\t결제금액\t주문번호\n2026. 11. 01.\t쿠팡\t12,300원\tTEST-123');
 const rows=normalizeShoppingGrid(grid,detectShoppingColumns(grid[0]),'네이버',today);
 assert.equal(rows[0].date,'2026-11-01');assert.equal(rows[0].money.amount,12300);assert.equal(rows[0].money.order.platform,'쿠팡');assert.equal(rows[0].selected,true);
});
test('같은 주문 총액의 상품 행은 합산하지 않고 하나로 묶는다',()=>{
 const rows=normalize([['2026-11-01','네이버','TEST-1','상품 A','10000','','','KRW'],['2026-11-01','네이버','TEST-1','상품 B','10000','','','KRW']]);
 assert.equal(rows.length,1);assert.equal(rows[0].money.amount,10000);assert.equal(rows[0].money.order.item,'상품 A / 상품 B');
});
test('같은 주문의 금액 충돌·번호 없음·외화·취소는 자동 선택하지 않는다',()=>{
 const rows=normalize([['2026-11-01','네이버','TEST-1','A','10000','','','KRW'],['2026-11-01','네이버','TEST-1','B','5000','','','KRW'],['2026-11-01','지그재그','','C','10000','','','KRW'],['2026-11-01','G마켓','TEST-4','D','10000','환불완료','','KRW'],['2026-11-01','쿠팡','TEST-5','E','10000','','','USD']]);
 assert.ok(rows.every(r=>!r.selected));assert.ok(rows[3].error);assert.ok(rows[4].error);
});
test('파일 내·기존 거래 중복을 막고 서로 다른 주문번호는 유지한다',()=>{
 const rows=normalize([['2026-11-01','네이버','TEST-1','A','10000','','','KRW'],['2026-11-01','네이버','TEST-2','B','10000','','','KRW']]);
 const result=planShoppingRows([{date:rows[0].date,money:rows[0].money}],rows,today);
 assert.equal(result.accepted.length,1);assert.equal(result.skipped.length,1);
 assert.equal(planShoppingRows([],rows.concat(rows),today).accepted.length,2);
});
test('미래 날짜·미결제·잘못된 열 연결을 저장하지 않는다',()=>{
 const rows=normalize([['2026-11-03','네이버','TEST-1','A','10000','','','KRW'],['2026-11-01','네이버','TEST-2','B','10000','입금대기','','KRW']]);assert.ok(rows.every(r=>r.error));
 rows[0].selected=true;assert.throws(()=>planShoppingRows([],rows,today));
 assert.throws(()=>normalizeShoppingGrid([headers,['']],{date:0,amount:0},'네이버',today));
});
test('주문 추출은 상품 가격을 결제합계로 추측하지 않는다',()=>{
 const rows=parseOrderBlocks(['2026.11.01 주문\n주문번호 TEST-100\n상품명: 테스트 물건\n상품가격 30,000원\n최종 결제 금액\n25,000원'],'쿠팡');
 assert.equal(rows.length,1);assert.equal(rows[0][4],'25000');
 const product=parseOrderBlocks(['2026.11.01 주문\n주문번호 TEST-101\n상품가격 30,000원'],'쿠팡');assert.equal(product[0][4],'');
});
test('주문번호 없는 목록도 검토용으로 추출하고 여러 날짜의 주문을 분리한다',()=>{
 const rows=parseOrderBlocks(['2026.11.01 주문\n주문 상세보기\n상품가격 30,000원\n2026.10.30 주문\n주문 상세보기\n결제금액 20,000원'],'쿠팡');
 assert.equal(rows.length,2);assert.equal(rows[0][2],'');assert.equal(rows[1][4],'20000');
});
test('추출 결과의 취소 완료와 상충하는 결제합계는 확인을 요구한다',()=>{
 const rows=parseOrderBlocks(['2026.11.01\n주문번호 TEST-100\n총 결제 금액 10,000원\n최종 결제 금액 8,000원\n취소 완료'],'네이버');assert.equal(rows[0][4],'');assert.equal(rows[0][6],'취소/환불 완료');
 const code=decodeURIComponent(shoppingBookmarklet().slice('javascript:'.length));assert.doesNotThrow(()=>new Function(code));assert.ok(!/fetch\(|document.cookie|localStorage/.test(code));
});

test('여러 기간 파일의 열 제목을 각각 찾고 중복 주문은 한 번만 계획한다',async()=>{
 const {normalizeShoppingBatch}=await import('../shopping-table.js');
 const row=['2026-11-01','G마켓','BATCH-1','상품 A','10000','','','KRW'];
 const rows=normalizeShoppingBatch([{name:'1페이지.csv',grid:[headers,row]},{name:'2페이지.csv',grid:[['주문 목록'],headers,row]}],'네이버',today);
 assert.equal(rows.length,2);assert.equal(rows[1].source,3);assert.equal(rows[1].sourceName,'2페이지.csv');
 const plan=planShoppingRows([],rows,today);assert.equal(plan.accepted.length,1);assert.equal(plan.skipped.length,1);
});
test('여러 파일에서 같은 주문의 합계가 다르면 자동 선택하지 않는다',async()=>{
 const {normalizeShoppingBatch}=await import('../shopping-table.js');
 const rows=normalizeShoppingBatch([{name:'A.csv',grid:[headers,['2026-11-01','G마켓','BATCH-2','A','10000','','','KRW']]},{name:'B.csv',grid:[headers,['2026-11-01','G마켓','BATCH-2','A','9000','','','KRW']]}],'네이버',today);
 assert.ok(rows.every(r=>!r.selected&&r.warning));
 assert.throws(()=>normalizeShoppingBatch([{name:'잘못된 파일.csv',grid:[['상품명','상품가'],['상품 A','10000']]}],'네이버',today),/잘못된 파일.csv/);
});

test('지그재그의 짧은 한국어 주문 날짜를 2000년 이후 날짜로 읽는다',()=>{
 const rows=parseOrderBlocks(['26년 10월 31일 주문상세\n주문번호 TEST-ZIGZAG\n최종 결제 금액 12000원'],'지그재그');
 assert.equal(rows[0][0],'2026-10-31');assert.equal(rows[0][4],'12000');assert.equal(parseOrderBlocks(['26.10.31 결제\n(주문번호 TEST-ZIGZAG)\n총 결제 금액\n12000원'],'지그재그')[0][0],'2026-10-31');
});

test('네이버 결제정보의 주문금액 총액을 읽고 상품금액과 혼동하지 않는다',()=>{
 const text='2026.11.01 주문\n주문번호 TEST-NAVER\n결제정보\n주문금액\n총 10,000원\n상품금액\n12,000원\n쿠폰할인\n-2,000원\n네이버페이 포인트 사용\n1,000원\n카드 간편결제\n9,000원';assert.equal(parseOrderBlocks([text],'네이버')[0][4],'10000');assert.equal(parseOrderBlocks([text.replace('결제정보','상품정보')],'네이버')[0][4],'');
});

test('재수집은 같은 주문과 날짜·금액 변경, 환불을 구분하고 기존 상품 정리를 유지한다',async()=>{
 const {shoppingRefreshReview,applyShoppingRefresh}=await import('../shopping-table.js');
 const [row]=normalize([['2026-11-01','쿠팡','REFRESH-1','상품','10000','','','KRW']]);
 const old={id:'original',date:row.date,money:structuredClone(row.money)};old.money.category='직접 분류';old.money.order.item='정리한 상품';
 assert.equal(shoppingRefreshReview([old],row).kind,'same');row.money.amount=9000;
 const review=shoppingRefreshReview([old],row);assert.equal(review.kind,'changed');assert.match(review.message,/10,000원 → 9,000원/);
 applyShoppingRefresh([old],{...review,date:row.date,money:row.money});assert.equal(old.money.amount,9000);assert.equal(old.money.category,'직접 분류');assert.equal(old.money.order.item,'정리한 상품');
 assert.throws(()=>applyShoppingRefresh([old],{...review,date:row.date,money:row.money}),/바뀌었/);
 row.blocked=true;assert.equal(shoppingRefreshReview([old],row).kind,'refund');assert.equal(old.money.amount,9000);
 assert.equal(shoppingRefreshReview([old,{...old,id:'other'}],row).kind,'conflict');
});
test('복합 결제의 금액을 재수집으로 덮어쓰지 않는다',async()=>{const {shoppingRefreshReview,applyShoppingRefresh}=await import('../shopping-table.js');const [row]=normalize([['2026-11-01','쿠팡','REFRESH-2','상품','10000','','','KRW']]);const old={id:'split',date:row.date,money:structuredClone(row.money)};old.money.splits=[{method:'카드',amount:10000}];row.money.amount=9000;const p=shoppingRefreshReview([old],row);assert.throws(()=>applyShoppingRefresh([old],{...p,date:row.date,money:row.money}),/복합/);assert.equal(old.money.amount,10000)});

test('쇼핑 파일은 별도 시간 열과 날짜에 포함된 시간을 보존하고 현재 시간을 만들지 않는다',async()=>{
 const {normalizeShoppingGrid,detectShoppingColumns,planShoppingRows}=await import('../shopping-table.js');
 for(const grid of [[['주문일','결제시간','주문번호','결제금액'],['2026-11-01','9:23','time-a','3000']],[['결제일시','주문번호','결제금액'],['2026-11-01 09:23:45','time-a','3000']]]){const rows=normalizeShoppingGrid(grid,detectShoppingColumns(grid[0]),'네이버','2026-11-05');assert.equal(rows[0].time,'09:23');assert.equal(planShoppingRows([],rows,'2026-11-05').accepted[0].time,'09:23')}
 const grid=[['주문일','결제시간','주문번호','결제금액'],['2026-11-01','25:00','bad','3000'],['2026-11-01','','blank','3000']];const rows=normalizeShoppingGrid(grid,detectShoppingColumns(grid[0]),'네이버','2026-11-05');assert.equal(rows[0].selected,false);assert.match(rows[0].warning,/결제 시간/);assert.equal(rows[1].time,undefined);
});
test('파일 재가져오기는 빈 결제 시간만 보완하고 메모·상품 상세를 보존하며 동시 수정은 거부한다',async()=>{
 const {shoppingRefreshReview,applyShoppingRefresh}=await import('../shopping-table.js');const money={type:'expense',currency:'KRW',merchant:'네이버',amount:3000,payment:'카드',category:'내 분류',order:{platform:'네이버',id:'time-a',item:'우유',items:[{name:'우유',family:'우유',category:'식품',quantity:1000,unit:'ml',amount:3000}]}};const old={id:'log',date:'2026-11-01',time:'',text:'내 메모',money},row={date:old.date,time:'09:23',money:structuredClone(money)};const review=shoppingRefreshReview([old],row);assert.equal(review.kind,'changed');const before=structuredClone(old);applyShoppingRefresh([old],{...review,...row});assert.deepEqual(old,{...before,time:'09:23'});assert.equal(shoppingRefreshReview([old],{...row,time:'10:00'}).kind,'conflict');assert.throws(()=>applyShoppingRefresh([old],{...review,...row}),/바뀌었/);
});
