import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePrimaryActivity,readPrimaryActivityId,writePrimaryActivityId,primaryPreferencePayload,primaryStorageKey} from '../activity-primary.js';

const log=id=>({id,date:'2026-11-10',time:'10:00',kind:'일상',text:id});

test('대표는 진행 중인 선호 id를 쓰고 없으면 마지막 진행 중으로 둔다',()=>{
 const ongoing=[log('a'),log('b'),log('c')];
 assert.equal(resolvePrimaryActivity(ongoing,'b').id,'b');
 assert.equal(resolvePrimaryActivity(ongoing,'missing').id,'c');
 assert.equal(resolvePrimaryActivity(ongoing,null).id,'c');
 assert.equal(resolvePrimaryActivity([],'a'),null);
});

test('대표 선택은 로컬 키에만 저장되고 기록 필드를 만들지 않는다',()=>{
 const store=new Map();
 const storage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 assert.equal(primaryStorageKey('hazeflow-qa'),'hazeflow-qa-primary-activity');
 writePrimaryActivityId(storage,'hazeflow-qa','act-1');
 assert.equal(readPrimaryActivityId(storage,'hazeflow-qa'),'act-1');
 writePrimaryActivityId(storage,'hazeflow-qa',null);
 assert.equal(readPrimaryActivityId(storage,'hazeflow-qa'),null);
 const payload=primaryPreferencePayload('act-2',100,'phone');
 assert.deepEqual(payload,{primaryActivityId:'act-2',primaryUpdatedAt:100,primaryUpdatedBy:'phone'});
});
