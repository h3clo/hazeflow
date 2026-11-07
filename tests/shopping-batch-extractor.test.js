import test from 'node:test';
import assert from 'node:assert/strict';
import {
 batchOrderUrls,
 findNaverOrderLinks,
 parseNaverDetailDoc,
 buildPurchaseProposal,
 buildPurchaseProposalsFile
} from '../shopping-batch-extractor.js';

test('batchOrderUrls는 유효한 네이버 상세 URL만 필터링하고 최대 개수를 제한한다', () => {
 const sample = [
  'https://orders.pay.naver.com/order/status/2026110712345678',
  'https://orders.pay.naver.com/order/status/2026110712345678?returnUrl=abc',
  'https://invalid.com/test',
  'https://orders.pay.naver.com/order/status/notanumber'
 ];
 const res = batchOrderUrls(sample, 10);
 assert.equal(res.length, 1);
 assert.equal(res[0], 'https://orders.pay.naver.com/order/status/2026110712345678');
});

test('findNaverOrderLinks는 DOM 링크 중 이미 완료된 excludedIds를 건너뛴다', () => {
 const links = [
  {href: 'https://orders.pay.naver.com/order/status/202611070001'},
  {href: 'https://orders.pay.naver.com/order/status/202611070002'},
  {href: 'https://orders.pay.naver.com/order/status/202611070003'}
 ];
 const mockDoc = {
  querySelectorAll: sel => links
 };
 const res = findNaverOrderLinks(mockDoc, ['202611070002']);
 assert.equal(res.length, 2);
 assert.ok(res.includes('https://orders.pay.naver.com/order/status/202611070001'));
 assert.ok(res.includes('https://orders.pay.naver.com/order/status/202611070003'));
 assert.ok(!res.includes('https://orders.pay.naver.com/order/status/202611070002'));
});

test('parseNaverDetailDoc과 buildPurchaseProposal은 정상 네이버 주문을 proposal 형식으로 변환한다', () => {
 const createMockDoc = () => {
  return {
   querySelectorAll: (sel) => {
    if(sel.includes('script')) return [];
    if(sel.includes('product')) return [{textContent: '크리넥스 3겹 화장지 30롤'}];
    return [];
   },
   createTextNode: (t) => ({textContent: t}),
   body: {
    textContent: [
     '구매확정완료',
     '상품가격 20,000원 상품주문번호 : 99887766',
     '1개',
     '최종 결제 금액 22,500원',
     '결제수단 카드',
     '배송비',
     '2,500원'
    ].join('\n')
   }
  };
 };

 const mockDoc = createMockDoc();
 const parsed = parseNaverDetailDoc(mockDoc, '2026110799887766', '2026-11-07');
 assert.equal(parsed.orderId, '2026110799887766');
 assert.equal(parsed.total, 22500);
 assert.equal(parsed.payment, '카드');
 assert.equal(parsed.isCancelled, false);

 const proposal = buildPurchaseProposal(parsed);
 assert.ok(proposal);
 assert.equal(proposal.orderId, '2026110799887766');
 assert.equal(proposal.expectedAmount, 22500);
 assert.equal(proposal.items.length, 1);
 assert.equal(proposal.items[0].name, '크리넥스 3겹 화장지 30롤');
 assert.equal(proposal.items[0].family, '화장지');
 assert.equal(proposal.items[0].unit, '롤');
 assert.equal(proposal.items[0].quantity, 30);
 assert.equal(proposal.charges?.shipping, 2500);

 const file = buildPurchaseProposalsFile([proposal]);
 assert.equal(file.type, 'hazeflow-purchase-proposals');
 assert.equal(file.proposals.length, 1);
});

test('취소 또는 환불 완료 주문은 proposal로 변환하지 않는다', () => {
 const mockDoc = {
  querySelectorAll: () => [],
  createTextNode: (t) => ({textContent: t}),
  body: {
   textContent: `
취소완료
상품명 크리넥스
상품가격 20,000원
상품주문번호 : 112233
최종 결제 금액 20,000원
   `
  }
 };
 const parsed = parseNaverDetailDoc(mockDoc, '20261107112233', '2026-11-07');
 assert.equal(parsed.isCancelled, true);
 const proposal = buildPurchaseProposal(parsed);
 assert.equal(proposal, null);
});
