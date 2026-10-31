import test from 'node:test';
import assert from 'node:assert/strict';
import {receiptSuggestion,bodySuggestion,scanDate} from '../scan-text.js';
test('영수증은 합계 표시가 있는 금액만 읽고 카드번호와 세금은 선택하지 않는다',()=>{const r=receiptSuggestion('상호명: 테스트 카페\n2026-10-30\n카드번호 1234567890123456\n부가세 527\n결제금액 5,800\n신용카드');assert.equal(r.values.amount,'5800');assert.equal(r.values.merchant,'테스트 카페');assert.equal(r.values.payment,'카드');assert.equal(r.values.date,'2026-10-30')});
test('서로 다른 합계가 있거나 합계 라벨이 없으면 금액을 지어내지 않는다',()=>{assert.equal(receiptSuggestion('TOTAL 5800\n합계 6000').values.amount,'');assert.equal(receiptSuggestion('카드번호 123456\n부가세 1000').values.amount,'');assert.equal(receiptSuggestion('TOTAL AMOUNT 5800').values.amount,'5800')});
test('인바디는 항목 이름과 함께 있는 측정값만 추출한다',()=>{const r=bodySuggestion('2026.10.29\n체중 (kg) 60.5 (50~70)\n골격근량 (kg) 25.2\n체지방량 (kg) 15.1\n체지방률 (%) 24.9');assert.deepEqual(r.values,{date:'2026-10-29',weight:'60.5',muscle:'25.2',fat:'15.1',fatPercent:'24.9'})});
test('영문 측정값과 단독 다음 줄을 읽되 중복 충돌·범위 밖 값은 비워둔다',()=>{const r=bodySuggestion('Weight\n60.5\nSkeletal Muscle Mass 25.2\nBody Fat Mass 15.1\nPBF 24.9');assert.equal(r.values.weight,'60.5');assert.equal(r.values.muscle,'25.2');assert.equal(bodySuggestion('Weight 60\nWeight 70').values.weight,undefined);assert.equal(bodySuggestion('체지방률 300').values.fatPercent,undefined);assert.equal(scanDate('2026-02-30'),'')});

test('외화·환불·애매한 소수점 금액을 원화 지출로 만들지 않는다',()=>{for(const text of ['TOTAL USD 5800','결제금액 5800 환불','TOTAL 5.800'])assert.equal(receiptSuggestion(text).values.amount,'');assert.equal(bodySuggestion('체중 (kg) 50~70 60.5').values.weight,undefined)});

test('OCR에서 단위 글자가 숫자로 잘못 읽혀도 측정값으로 선택하지 않는다',()=>{assert.equal(bodySuggestion('골격근량 (<8) 25.2').values.muscle,'25.2');assert.equal(bodySuggestion('체중 6O.5').values.weight,undefined);assert.equal(bodySuggestion('체중 60,5').values.weight,undefined)});
