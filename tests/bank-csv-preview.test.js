import test from 'node:test';
import assert from 'node:assert/strict';
import {previewBankCsv,bankCsvDuplicateCandidates,decodeCsvBytes,decodeCsvText} from '../bank-csv-preview.js';

const synth=`이용일,가맹점,이용금액,구분
2026.11.01,테스트카페,5800,출금
2026/11/02,급여,1000000,입금
2026-11-03,편의점,1200,출금
`;

test('합성 은행 CSV에서 날짜·금액·가맹점을 읽고 저장 플래그는 미리보기만이다',()=>{
 const preview=previewBankCsv(synth,{today:'2026-11-08'});
 assert.equal(preview.previewOnly,true);
 assert.equal(preview.transactions.length,3);
 assert.equal(preview.transactions[0].date,'2026-11-01');
 assert.equal(preview.transactions[0].amount,5800);
 assert.equal(preview.transactions[0].type,'expense');
 assert.equal(preview.transactions[1].type,'income');
 assert.equal(preview.transactions[1].amount,1000000);
});

test('기존 기록과 비교해도 중복을 확정하지 않고 후보만 붙인다',()=>{
 const preview=previewBankCsv(synth,{today:'2026-11-08'});
 const logs=[
  {id:'x',date:'2026-11-01',money:{type:'expense',amount:5800,currency:'KRW',merchant:'테스트카페',category:'',payment:''}},
  {id:'y',date:'2026-11-03',money:{type:'expense',amount:1200,currency:'KRW',merchant:'다른편의점',category:'식비',payment:'카드'}}
 ];
 const rows=bankCsvDuplicateCandidates(logs,preview.transactions);
 assert.equal(rows[0].candidate,'exact-fingerprint');
 assert.equal(rows[2].candidate,'same-day-amount');
 assert.equal(logs[0].money.amount,5800);
});

test('헤더 동의어·잘못된 날짜 행을 안전하게 건너뛴다',()=>{
 const text=`거래일자,적요,출금,입금
2026-99-99,깨진날짜,1000,
2026-11-04,정상,2000,
`;
 const preview=previewBankCsv(text,{today:'2026-11-08'});
 assert.equal(preview.transactions.length,1);
 assert.equal(preview.rowErrors.length,1);
 assert.equal(preview.transactions[0].merchant,'정상');
});

test('UTF-8 텍스트 디코드는 BOM을 제거하고 원문을 로그에 남기지 않는 구조다',()=>{
 const {text,encoding}=decodeCsvText('\uFEFF날짜,상호명,금액\n2026-11-01,A,1000');
 assert.equal(encoding,'utf-8');
 assert.equal(text.startsWith('날짜'),true);
 const bytes=new TextEncoder().encode(text);
 const decoded=decodeCsvBytes(bytes);
 assert.equal(decoded.encoding,'utf-8');
});
