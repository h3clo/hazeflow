import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {openRecordStorage} from '../indexed-record-storage.js';
import {emptyState} from '../domain.js';
import {assertRecordUnchanged} from '../record-edit.js';
test('다른 창의 완료 저장 뒤 오래된 할 일 편집을 거부하고 최신 기록을 유지한다',async()=>{
 const map=new Map(),local={get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},indexedDB=new IDBFactory(),opts={local,indexedDB,namespace:'task-qa',channelFactory:()=>null};
 const a=await openRecordStorage(opts),b=await openRecordStorage(opts),state=emptyState(),opened={id:'t',title:'점검',note:'원래 내용',listName:'할 일',done:false,dueDate:null};state.tasks=[opened];await a.setItem('task-qa',JSON.stringify(state));
 await b.update('task-qa',raw=>{const next=JSON.parse(raw);next.tasks[0].done=true;next.tasks[0].completedOn='2026-11-07';return JSON.stringify(next)});
 await assert.rejects(a.update('task-qa',raw=>{const next=JSON.parse(raw);assertRecordUnchanged(next.tasks[0],opened);next.tasks[0].note='오래된 창의 수정';return JSON.stringify(next)}),/다른 기기/);
 const actual=JSON.parse(await a.read('task-qa')).tasks[0];assert.equal(actual.done,true);assert.equal(actual.note,'원래 내용');a.close();b.close();
});
