import test from 'node:test';import assert from 'node:assert/strict';import {IDBFactory} from 'fake-indexeddb';import {openRecordStorage} from '../indexed-record-storage.js';import {emptyState} from '../domain.js';import {readBackupState,assertBackupIdle,assertBackupOwner,assertBackupFileSize,resolveImportMode,importCommitOutcome,withImportedPhotos} from '../backup-state.js';
import {makePhotoStore} from '../photos.js';
test('방금 저장한 활동 종료를 기다린 뒤 백업에 넣는다',async()=>{const m=new Map(),local={get length(){return m.size},key:i=>[...m.keys()][i],getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},store=await openRecordStorage({local,indexedDB:new IDBFactory(),namespace:'qa',channelFactory:()=>null}),d=emptyState();d.logs=[{id:'a',date:'2026-11-06',time:'10:00',kind:'일상',text:'독서'}];await store.setItem('qa',JSON.stringify(d));const saving=store.update('qa',raw=>{const state=JSON.parse(raw);state.logs[0].endDate='2026-11-06';state.logs[0].endTime='11:00';return JSON.stringify(state)}),backup=readBackupState({storage:store,key:'qa',getKey:()=> 'qa'});await saving;assert.equal((await backup).logs[0].endTime,'11:00');store.close()});
test('백업 읽기 중 계정이 바뀌면 다른 계정의 파일로 내려받지 않는다',async()=>{let owner='a';await assert.rejects(readBackupState({storage:{async read(){owner='b';return JSON.stringify(emptyState())}},key:'a',getKey:()=>owner}),/계정이 바뀌어/)});
test('로그인 확인 중에는 내보내기·가져오기를 막는다',()=>{
 assert.throws(()=>assertBackupIdle(true,'export'),/확인 중이에요.*내보내/);
 assert.throws(()=>assertBackupIdle(true,'import'),/확인 중이에요.*불러와/);
 assert.doesNotThrow(()=>assertBackupIdle(false,'export'));
});
test('백업 전송 중 계정이 바뀌면 중단한다',()=>{
 assert.throws(()=>assertBackupOwner('a','b','내보내기'),/계정이 바뀌어 내보내기를 중단/);
 assert.throws(()=>assertBackupOwner('a','b','불러오기'),/계정이 바뀌어 불러오기를 중단/);
 assert.doesNotThrow(()=>assertBackupOwner('a','a','내보내기'));
});
test('너무 큰 백업 파일은 가져오기 전에 거절한다',()=>{
 assert.throws(()=>assertBackupFileSize(100*1024*1024+1),/100MB/);
 assert.doesNotThrow(()=>assertBackupFileSize(100*1024*1024));
});
test('복구 모드 가져오기는 저장 성공 후에만 recovery를 해제한다',()=>{
 assert.equal(resolveImportMode('raw-json'),'restore');
 assert.equal(resolveImportMode(null),'merge');
 assert.deepEqual(importCommitOutcome({saved:true,mode:'restore'}),{clearRecovery:true,status:'불러오기 완료'});
 assert.deepEqual(importCommitOutcome({saved:true,mode:'merge'}),{clearRecovery:false,status:'불러오기 완료'});
 assert.throws(()=>importCommitOutcome({saved:false,mode:'merge'}),/저장을 완료하지 못했어요/);
 assert.throws(()=>importCommitOutcome({saved:false,mode:'restore'}),/저장을 완료하지 못했어요/);
});
test('기록 커밋 실패 시 이번에 새로 넣은 백업 사진만 되돌린다',async()=>{
 globalThis.indexedDB=new IDBFactory();
 const store=makePhotoStore('qa-import-photos-fail-'+Date.now());
 const existing=new Blob([Uint8Array.of(1)],{type:'image/jpeg'});
 const fresh=new Blob([Uint8Array.of(2)],{type:'image/jpeg'});
 await store.put('keep-photo',existing);
 await assert.rejects(withImportedPhotos(store,[['keep-photo',existing],['fresh-photo',fresh]],async keep=>{throw Error('기록 저장 실패')}),/기록 저장 실패/);
 assert.ok(await store.get('keep-photo'));
 assert.equal(await store.get('fresh-photo'),null);
});
test('기록 저장 성공 후 render 실패해도 참조 사진은 유지한다',async()=>{
 globalThis.indexedDB=new IDBFactory();
 const store=makePhotoStore('qa-import-photos-keep-'+Date.now());
 const fresh=new Blob([Uint8Array.of(3)],{type:'image/jpeg'});
 await assert.rejects(withImportedPhotos(store,[['fresh-photo',fresh]],async keep=>{
  keep();
  throw Error('화면 갱신 실패');
 }),/화면 갱신 실패/);
 assert.ok(await store.get('fresh-photo'));
});
test('계정 전환으로 저장 전 중단되면 신규 사진만 되돌린다',async()=>{
 globalThis.indexedDB=new IDBFactory();
 const store=makePhotoStore('qa-import-photos-switch-'+Date.now());
 const existing=new Blob([Uint8Array.of(4)],{type:'image/jpeg'});
 const fresh=new Blob([Uint8Array.of(5)],{type:'image/jpeg'});
 await store.put('keep-photo',existing);
 await assert.rejects(withImportedPhotos(store,[['keep-photo',existing],['fresh-photo',fresh]],async keep=>{
  assertBackupOwner('account-a','account-b','불러오기');
  keep();
 }),/계정이 바뀌어/);
 assert.ok(await store.get('keep-photo'));
 assert.equal(await store.get('fresh-photo'),null);
});
test('동시 가져오기에서 한쪽 실패는 다른 쪽 keep된 사진을 지우지 않는다',async()=>{
 globalThis.indexedDB=new IDBFactory();
 const store=makePhotoStore('qa-import-photos-concurrent-'+Date.now());
 const a=new Blob([Uint8Array.of(6)],{type:'image/jpeg'});
 const b=new Blob([Uint8Array.of(7)],{type:'image/jpeg'});
 const first=withImportedPhotos(store,[['photo-a',a]],async keep=>{
  await new Promise(r=>setTimeout(r,20));
  keep();
 });
 const second=assert.rejects(withImportedPhotos(store,[['photo-b',b]],async keep=>{
  await new Promise(r=>setTimeout(r,5));
  throw Error('두 번째 가져오기 실패');
 }),/두 번째 가져오기 실패/);
 await Promise.all([first,second]);
 assert.ok(await store.get('photo-a'));
 assert.equal(await store.get('photo-b'),null);
});
test('keep를 호출하지 않고 끝나면 신규 사진을 되돌린다',async()=>{
 globalThis.indexedDB=new IDBFactory();
 const store=makePhotoStore('qa-import-photos-nokeep-'+Date.now());
 const fresh=new Blob([Uint8Array.of(8)],{type:'image/jpeg'});
 await withImportedPhotos(store,[['fresh-photo',fresh]],async keep=>{});
 assert.equal(await store.get('fresh-photo'),null);
});
