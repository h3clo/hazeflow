import test from 'node:test';
import assert from 'node:assert/strict';
import {
 parseTransactionRecords,
 parseCollectedNaverOrders,
 reconcileOrdersWithTransactions
} from '../scripts/reconcile-naver-orders.mjs';

test('reconcileOrdersWithTransactions는 주문번호 직접 일치 및 날짜 오차를 정확히 매칭한다', () => {
 const orders = [
  {
   orderId: '202611010001',
   date: '2026-11-01',
   total: 15000,
   firstItem: '샴푸 500ml',
   items: [{name: '샴푸 500ml', family: '샴푸', category: '생활용품', quantity: 1, unit: '개', amount: 15000}],
   isCancelled: false
  },
  {
   // Date diff: order on 11-02, card approved on 11-03
   orderId: '202611020002',
   date: '2026-11-02',
   total: 28000,
   firstItem: '화장지 30롤',
   items: [{name: '화장지 30롤', family: '화장지', category: '생활용품', quantity: 30, unit: '롤', amount: 28000}],
   isCancelled: false
  },
  {
   // Cancelled
   orderId: '202611030003',
   date: '2026-11-03',
   total: 10000,
   firstItem: '취소된 물품',
   items: [],
   isCancelled: true
  },
  {
   // Already enriched
   orderId: '202611040004',
   date: '2026-11-04',
   total: 9000,
   firstItem: '이미 완료된 물품',
   items: [{name: '이미 완료된 물품', amount: 9000}],
   isCancelled: false
  },
  {
   // Unmatched
   orderId: '202611050005',
   date: '2026-11-05',
   total: 99000,
   firstItem: '기록 없는 주문',
   items: [{name: '기록 없는 주문', amount: 99000}],
   isCancelled: false
  }
 ];

 const transactions = [
  {
   id: 'tx-1',
   date: '2026-11-01',
   amount: 15000,
   merchant: '네이버파이낸셜',
   orderId: '202611010001'
  },
  {
   id: 'tx-2',
   date: '2026-11-03', // 1 day after order date
   amount: 28000,
   merchant: '네이버페이',
   orderId: ''
  },
  {
   id: 'tx-4',
   date: '2026-11-04',
   amount: 9000,
   merchant: '네이버',
   orderId: '202611040004',
   items: [{name: '완료 상품', amount: 9000}]
  }
 ];

 const res = reconcileOrdersWithTransactions(orders, transactions);

 assert.equal(res.matched.length, 2);
 assert.equal(res.matched[0].order.orderId, '202611010001');
 assert.equal(res.matched[0].method, '주문번호 직접 일치');

 assert.equal(res.matched[1].order.orderId, '202611020002');
 assert.equal(res.matched[1].method, '결제일 오차(±1일)·금액 일치');

 assert.equal(res.skippedCancelled.length, 1);
 assert.equal(res.skippedCancelled[0].order.orderId, '202611030003');

 assert.equal(res.skippedExisting.length, 1);
 assert.equal(res.skippedExisting[0].order.orderId, '202611040004');

 assert.equal(res.unmatched.length, 1);
 assert.equal(res.unmatched[0].order.orderId, '202611050005');
});

test('parseCollectedNaverOrders는 proposals JSON 및 CSV 모두 안전하게 파싱한다', () => {
 const proposalsJson = JSON.stringify({
  type: 'hazeflow-purchase-proposals',
  version: 1,
  proposals: [
   {
    id: 'ord-1',
    date: '2026-11-01',
    platform: '네이버',
    orderId: 'ord-1',
    expectedOrderItem: '치약',
    expectedAmount: 5000,
    items: [{name: '치약', family: '치약', category: '생활용품', quantity: 1, unit: '개', amount: 5000}]
   }
  ]
 });

 const jsonParsed = parseCollectedNaverOrders(proposalsJson);
 assert.equal(jsonParsed.length, 1);
 assert.equal(jsonParsed[0].orderId, 'ord-1');
 assert.equal(jsonParsed[0].total, 5000);

 const csvText = [
  '주문일,쇼핑몰,주문번호,상품명,결제금액,결제수단,상태,금액근거,통화',
  '2026-11-02,네이버,ord-2,칫솔,3000원,카드,정상 결제,상세 확인,KRW'
 ].join('\n');

 const csvParsed = parseCollectedNaverOrders(csvText);
 assert.equal(csvParsed.length, 1);
 assert.equal(csvParsed[0].orderId, 'ord-2');
 assert.equal(csvParsed[0].total, 3000);
});
