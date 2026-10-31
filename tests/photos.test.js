import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {unzipSync,strFromU8} from 'fflate';
import {emptyState,validateBackup,dayDocument,mergeBackup} from '../domain.js';
import {validPhotoRefs,collectPhotoRefs,decodePhotoBundle} from '../photos.js';
import {photoBackup,documentZip} from '../photo-export.js';
const bytes=readFileSync(new URL('./fixtures/photo.jpg',import.meta.url)),ref=JSON.parse(readFileSync(new URL('./fixtures/photo-ref.json',import.meta.url),'utf8'));
function state(){const d=emptyState();d.logs.push({id:'photo-log',date:'2026-10-31',time:'12:00',kind:'식사',text:'',photos:[ref]});d.diary['2026-10-31']={note:'사진 일기',photos:[ref]};return d}
const store={get:async id=>id===ref.id?new Blob([bytes],{type:'image/jpeg'}):null};
test('사진만 있는 기록과 사진 일기를 검증하고 참조를 중복 없이 수집한다',()=>{const d=validateBackup(state());assert.equal(d.logs[0].text,'');assert.equal(collectPhotoRefs(d).length,1);assert.equal(collectPhotoRefs(d,['2026-10-30']).length,0)});
test('잘못된 사진 메타데이터와 8장을 넘는 첨부를 거부한다',()=>{assert.equal(validPhotoRefs([{...ref,id:'__proto__'}]),false);assert.equal(validPhotoRefs([{...ref,width:2000}]),false);assert.equal(validPhotoRefs(Array.from({length:9},(_,i)=>({...ref,id:'photo-'+i}))),false);const d=state();d.diary['2026-10-31'].photos='bad';assert.throws(()=>validateBackup(d))});
test('사진 포함 JSON은 이미지 바이트를 보존하고 일반 상태에는 큰 base64를 남기지 않는다',async()=>{const packed=await photoBackup(state(),store),restored=validateBackup(packed),entries=decodePhotoBundle(packed.photoData,collectPhotoRefs(restored));assert.equal(restored.photoData,undefined);assert.equal(entries.length,1);assert.deepEqual(new Uint8Array(await entries[0][1].arrayBuffer()),new Uint8Array(bytes));assert.match(dayDocument(restored,'2026-10-31'),new RegExp(ref.id))});
test('사진이 빠지거나 크기가 바뀐 백업은 복원 전에 거부한다',()=>{assert.throws(()=>decodePhotoBundle({},[ref]));assert.throws(()=>decodePhotoBundle({[ref.id]:'data:image/jpeg;base64,/9j/2Q=='},[ref]))});
test('MD와 실제 JPEG가 같은 ZIP 안에 들어간다',async()=>{const zip=await documentZip(state(),['2026-10-31'],store),files=unzipSync(zip);assert.deepEqual(files['photos/'+ref.id+'.jpg'],new Uint8Array(bytes));assert.match(strFromU8(files['haze-flow-2026-10-31.md']),new RegExp('photos/'+ref.id+'\\.jpg'))});
test('없는 사진을 조용히 제외하지 않고 백업 실패를 알린다',async()=>{await assert.rejects(photoBackup(state(),{get:async()=>null}));await assert.rejects(documentZip(state(),['2026-10-31'],{get:async()=>null}))});
test('사진 기록을 다시 불러와도 기록 수는 늘어나지 않는다',()=>{const d=state(),merged=mergeBackup(d,d);assert.equal(merged.logs.length,1);assert.deepEqual(merged.logs[0].photos,[ref])});
