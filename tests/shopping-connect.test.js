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
