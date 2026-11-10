import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,activityIntervals,validateBackup,mergeBackup} from '../domain.js';
import {flattenState,unflattenState,itemKey,reconcile,activityUiItemKey} from '../sync-state.js';
import {createSyncEngine} from '../sync-engine.js';
import {
 comparePrimaryPreference,
 mergePrimaryPreference,
 primaryPreferencePayload,
 setPrimaryPreference,
 primaryIdFromState,
 mirrorPrimaryPreference,
 readPrimaryActivityId,
 resolvePrimaryActivity,
 ACTIVITY_UI_ID
} from '../activity-primary.js';

const log=(id,time='10:00',extra={})=>({id,date:'2026-11-10',time,kind:'일상',text:id,...extra});
const independent=(id,time,extra={})=>({...log(id,time,extra),activityTiming:'independent'});
const memory=()=>{const values=new Map();return {getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}};
function device(server,initial=emptyState(),initialMeta=null){let state=structuredClone(initial),raw=initialMeta?JSON.stringify(initialMeta):null,status;const engine=createSyncEngine({transport:server,storage:{getItem:()=>raw,setItem:v=>raw=v},photoStore:{get:async()=>null,put:async()=>{}},read:()=>structuredClone(state),write:s=>state=structuredClone(s),onStatus:s=>status=s,online:()=>server.online!==false});return {engine,get state(){return state},set state(s){state=s},get status(){return status},edit(fn){fn(state)}}}
function fakeServer(){const rows={};return {online:true,rows,pull:async()=>Object.values(structuredClone(rows)),async push(ops){if(ops.some(op=>(rows[op.item_key]?.version||0)!==op.base_version&&rows[op.item_key]?.mutation_id!==op.mutation_id))return {applied:false,rows:[]};const saved=[];for(const op of ops){const old=rows[op.item_key];if(old?.mutation_id===op.mutation_id){saved.push(old);continue}rows[op.item_key]={...op,version:(old?.version||0)+1};saved.push(rows[op.item_key])}return {applied:true,rows:structuredClone(saved)}},uploadPhoto:async()=>{},downloadPhoto:async()=>new Blob([])}}

test('대표 선호 LWW는 더 늦은 시각을 고르고 동일 시각이면 device id로 결정한다',()=>{
 const a=primaryPreferencePayload('a',100,'phone');
 const b=primaryPreferencePayload('b',200,'tablet');
 assert.equal(comparePrimaryPreference(a,b),-1);
 assert.equal(mergePrimaryPreference(undefined,a,b).value.primaryActivityId,'b');
 const tieA=primaryPreferencePayload('a',100,'aaa');
 const tieB=primaryPreferencePayload('b',100,'bbb');
 assert.equal(mergePrimaryPreference(undefined,tieA,tieB).value.primaryActivityId,'b');
 assert.equal(mergePrimaryPreference(undefined,tieA,tieB).value.primaryUpdatedBy,'bbb');
});

test('preferences.activityUi가 flatten/unflatten과 백업 검증을 통과한다',()=>{
 const d=emptyState();
 setPrimaryPreference(d,'act-1',{at:1,deviceId:'dev'});
 assert.equal(primaryIdFromState(d),'act-1');
 const restored=unflattenState(flattenState(d));
 assert.equal(restored.preferences[ACTIVITY_UI_ID].primaryActivityId,'act-1');
 assert.equal(validateBackup(restored).preferences.activityUi.primaryActivityId,'act-1');
});

test('대표 선호 충돌은 사용자 충돌 없이 LWW로 합친다',()=>{
 const basePayload=primaryPreferencePayload('a',100,'a');
 const base={[activityUiItemKey()]:{item_key:activityUiItemKey(),payload:basePayload,version:1,deleted:false,mutation_id:'m1'}};
 const local=emptyState();setPrimaryPreference(local,'local',{at:150,deviceId:'phone'});
 const remote={[activityUiItemKey()]:{item_key:activityUiItemKey(),payload:primaryPreferencePayload('remote',200,'tablet'),version:2,deleted:false,mutation_id:'m2'}};
 const merged=reconcile(local,base,remote);
 assert.equal(merged.conflicts.length,0);
 assert.equal(merged.state.preferences.activityUi.primaryActivityId,'remote');
});

test('두 기기의 대표 선택이 왕복하고 활동 시간은 변하지 않는다',async()=>{
 const server=fakeServer(),a=device(server),b=device(server);
 a.edit(s=>{s.logs.push(independent('x','09:00'),independent('y','09:05'));setPrimaryPreference(s,'x',{at:10,deviceId:'a'})});
 await a.engine.sync();await b.engine.sync();
 assert.equal(b.state.preferences.activityUi.primaryActivityId,'x');
 const before=structuredClone(b.state.logs);
 b.edit(s=>setPrimaryPreference(s,'y',{at:20,deviceId:'b'}));
 await b.engine.sync();await a.engine.sync();
 assert.equal(a.state.preferences.activityUi.primaryActivityId,'y');
 assert.deepEqual(a.state.logs.map(l=>({id:l.id,time:l.time,end:l.endTime||''})),before.map(l=>({id:l.id,time:l.time,end:l.endTime||''})));
 a.engine.stop();b.engine.stop();
});

test('오프라인 대표 변경은 재연결 후 동기화되고 로컬 캐시에 남는다',async()=>{
 const server=fakeServer(),store=memory(),a=device(server);
 server.online=false;
 a.edit(s=>{s.logs.push(independent('keep','10:00'));setPrimaryPreference(s,'keep',{at:5,deviceId:'offline'})});
 await a.engine.sync();
 assert.equal(a.status.phase,'offline');
 mirrorPrimaryPreference(store,'user-a',a.state);
 assert.equal(readPrimaryActivityId(store,'user-a'),'keep');
 server.online=true;await a.engine.sync();
 assert.equal(a.status.phase,'synced');
 assert.equal(server.rows[activityUiItemKey()].payload.primaryActivityId,'keep');
 a.engine.stop();
});

test('종료·삭제된 대표 id는 UI에서 진행 중 기본값으로 폴백한다',()=>{
 const ongoing=[independent('alive','11:00')];
 assert.equal(resolvePrimaryActivity(ongoing,'gone').id,'alive');
 assert.equal(resolvePrimaryActivity(ongoing,null).id,'alive');
});

test('레거시·독립 혼합 동기화 후에도 레거시 추론 종료와 대표 선호가 유지된다',async()=>{
 const server=fakeServer(),a=device(server),b=device(server);
 a.edit(s=>{
  s.logs=[log('legacyA','09:00'),log('legacyB','10:00'),independent('indie','10:30')];
  setPrimaryPreference(s,'indie',{at:1,deviceId:'a'});
 });
 await a.engine.sync();await b.engine.sync();
 const now=new Date('2026-11-10T12:00:00');
 const intervals=activityIntervals(b.state,now);
 assert.equal(intervals.get('legacyA').endTime,'10:00');
 assert.equal(intervals.get('indie').ongoing,true);
 assert.equal(b.state.preferences.activityUi.primaryActivityId,'indie');
 a.engine.stop();b.engine.stop();
});

test('백업 병합은 대표 선호를 LWW로 합치고 알 수 없는 preferences id는 거부한다',()=>{
 const current=emptyState();setPrimaryPreference(current,'old',{at:1,deviceId:'a'});
 const incoming=emptyState();setPrimaryPreference(incoming,'new',{at:9,deviceId:'b'});
 const merged=mergeBackup(current,incoming);
 assert.equal(merged.preferences.activityUi.primaryActivityId,'new');
 assert.throws(()=>validateBackup({...emptyState(),preferences:{other:{primaryActivityId:'x',primaryUpdatedAt:1,primaryUpdatedBy:'d'}}}));
});

test('계정 네임스페이스 로컬 캐시는 서로 섞이지 않는다',()=>{
 const store=memory();
 const a=emptyState();setPrimaryPreference(a,'only-a',{at:1,deviceId:'a'});
 const b=emptyState();setPrimaryPreference(b,'only-b',{at:1,deviceId:'b'});
 mirrorPrimaryPreference(store,'hazeflow-v1-user-alice',a);
 mirrorPrimaryPreference(store,'hazeflow-v1-user-bob',b);
 assert.equal(readPrimaryActivityId(store,'hazeflow-v1-user-alice'),'only-a');
 assert.equal(readPrimaryActivityId(store,'hazeflow-v1-user-bob'),'only-b');
});
