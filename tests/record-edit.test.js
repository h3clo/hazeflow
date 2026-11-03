import test from 'node:test';
import assert from 'node:assert/strict';
import {assertRecordUnchanged} from '../record-edit.js';
const record={id:'expense',date:'2026-11-03',text:'장보기',money:{amount:10000,payer:'본인'}};
test('삭제된 거래를 오래된 편집창에서 다시 생성하지 못하게 막는다',()=>{assert.throws(()=>assertRecordUnchanged(undefined,record),/삭제된 기록/)});
test('다른 기기의 금액·부담자·사진 변경을 예전 편집 내용으로 덮어쓰지 못한다',()=>{for(const changed of [{...record,money:{...record.money,amount:20000}},{...record,money:{...record.money,payer:'아빠'}},{...record,photos:[{id:'photo'}]}])assert.throws(()=>assertRecordUnchanged(changed,record),/다른 기기/);assert.equal(record.money.amount,10000)});
test('동일 내용의 키 순서나 동기화가 정리한 빈 종료시간 때문에 저장을 막지 않는다',()=>{assert.doesNotThrow(()=>assertRecordUnchanged({money:{payer:'본인',amount:10000},text:'장보기',date:'2026-11-03',id:'expense',endTime:null},record));});
