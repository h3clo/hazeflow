/**
 * Data-stability regressions for backup/restore, workoutRests, and stale conflict guards
 * covering gaps relative to PRs #6–#20. No UI or schema changes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyState,validateBackup,mergeBackup,migrate} from '../domain.js';
import {importCommitOutcome,assertBackupOwner,assertBackupIdle,resolveImportMode} from '../backup-state.js';
import {appendWorkoutRest,averageRestSeconds,mergeWorkoutRests,validWorkoutRests,normalizeWorkoutRest} from '../workout-rests.js';
import {flattenState,unflattenState,itemKey,reconcile} from '../sync-state.js';
import {removeUnchangedItem,assertRecordUnchanged} from '../record-edit.js';
import {restoreCaptureDrafts,serializeCaptureDrafts} from '../capture-drafts.js';
import {decodePhotoBundle,collectPhotoRefs} from '../photos.js';

const workoutLog=(extra={})=>({id:'w1',date:'2026-11-08',time:'10:00',kind:'운동',text:'랫풀다운 40 12 3\n체스트프레스 20 12 3',...extra});
const rest=(itemIndex,seconds,endedAt=1_700_000_000_000,setIndex)=>({itemIndex,seconds,endedAt,...(setIndex===undefined?{}:{setIndex})});

test('스키마1·workoutRests 없는 옛 백업도 검증·마이그레이션된다',()=>{
 const raw={schemaVersion:1,events:[],tasks:[],routines:[],checks:{},diary:{},exercises:[],logs:[{id:'old',date:'2026-01-01',time:'09:00',kind:'운동',text:'스쿼트 60 8 3'}],life:{},routineTemplates:[],routineRuns:{},favorites:[],weeklyReviews:{}};
 const migrated=validateBackup(raw);
 assert.equal(migrated.schemaVersion,2);
 assert.equal(migrated.logs[0].workoutRests,undefined);
 assert.equal(averageRestSeconds(migrated.logs[0].workoutRests),null);
});

test('workoutRests가 있는 백업은 검증·flatten 왕복 후에도 유지된다',()=>{
 const d=emptyState();
 d.logs=[workoutLog({workoutRests:[rest(0,90),rest(0,95),rest(1,120)]})];
 const validated=validateBackup(d);
 assert.equal(validated.logs[0].workoutRests.length,3);
 const roundtrip=unflattenState(flattenState(validated));
 assert.deepEqual(roundtrip.logs[0].workoutRests,validated.logs[0].workoutRests);
 assert.equal(averageRestSeconds(roundtrip.logs[0].workoutRests),102);
});

test('잘못된 workoutRests 백업은 거부하고 현재 상태는 건드리지 않는다',()=>{
 const current=emptyState();
 current.logs=[workoutLog({text:'현재 운동',workoutRests:[rest(0,60)]})];
 const before=structuredClone(current);
 const bad=emptyState();
 bad.logs=[workoutLog({id:'bad',workoutRests:[{itemIndex:0,seconds:0,endedAt:1}]})];
 assert.throws(()=>validateBackup(bad),/휴식/);
 assert.throws(()=>mergeBackup(current,bad),/휴식/);
 assert.deepEqual(current,before);
});

test('병합 가져오기는 같은 id는 현재를 유지하고 새 운동·휴식을 추가한다',()=>{
 const current=emptyState();
 current.logs=[workoutLog({text:'현재 본문',workoutRests:[rest(0,70)]})];
 const incoming=emptyState();
 incoming.logs=[
  workoutLog({text:'백업 본문',workoutRests:[rest(0,999)]}),
  workoutLog({id:'w2',text:'새 운동',workoutRests:[rest(0,80)]}),
 ];
 const merged=mergeBackup(current,incoming);
 assert.equal(merged.logs.length,2);
 assert.equal(merged.logs.find(l=>l.id==='w1').text,'현재 본문');
 assert.equal(merged.logs.find(l=>l.id==='w1').workoutRests[0].seconds,70);
 assert.equal(merged.logs.find(l=>l.id==='w2').workoutRests[0].seconds,80);
});

test('복원 실패·커밋 실패 outcome은 예외로 막고 recovery는 성공 복원에서만 해제한다',()=>{
 assert.throws(()=>importCommitOutcome({saved:false,mode:'restore'}),/저장을 완료하지 못했어요/);
 assert.throws(()=>importCommitOutcome({saved:false,mode:'merge'}),/저장을 완료하지 못했어요/);
 assert.deepEqual(importCommitOutcome({saved:true,mode:'restore'}),{clearRecovery:true,status:'불러오기 완료'});
 assert.deepEqual(importCommitOutcome({saved:true,mode:'merge'}),{clearRecovery:false,status:'불러오기 완료'});
 assert.equal(resolveImportMode(null),'merge');
 assert.equal(resolveImportMode('raw-json'),'restore');
 assert.throws(()=>assertBackupOwner('guest','user-a','불러오기'),/계정/);
 assert.throws(()=>assertBackupIdle(true,'import'),/확인 중이에요/);
});

test('사진 번들 디코드 실패는 복원 전에 거부된다',()=>{
 const d=emptyState();
 d.logs=[{id:'p',date:'2026-10-31',time:'12:00',kind:'식사',text:'',photos:[{id:'photo-1',bytes:10,width:1,height:1,type:'image/jpeg'}]}];
 const refs=collectPhotoRefs(d);
 assert.throws(()=>decodePhotoBundle(undefined,refs));
 assert.throws(()=>decodePhotoBundle({},refs));
});

test('세트 사이 휴식은 itemIndex별로 분리되고 잘못된 항목은 붙지 않는다',()=>{
 let list=[];
 list=appendWorkoutRest(list,rest(0,90));
 list=appendWorkoutRest(list,rest(1,110));
 list=appendWorkoutRest(list,rest(0,100,1_700_000_000_100));
 assert.deepEqual(list.map(r=>r.itemIndex),[0,1,0]);
 assert.equal(list.filter(r=>r.itemIndex===0).length,2);
 assert.equal(list.filter(r=>r.itemIndex===1)[0].seconds,110);
 assert.throws(()=>appendWorkoutRest(list,{itemIndex:-1,seconds:30,endedAt:1}));
 assert.equal(normalizeWorkoutRest({itemIndex:0,seconds:0.4,endedAt:1}),null);
 assert.equal(validWorkoutRests(undefined),false);
 assert.deepEqual(mergeWorkoutRests([rest(0,50)],[rest(1,60)]).map(r=>r.itemIndex),[0,1]);
});

test('오래된 운동 기록에 workoutRests가 없어도 평균·병합·검증이 깨지지 않는다',()=>{
 const d=emptyState();
 d.logs=[workoutLog()];
 assert.doesNotThrow(()=>validateBackup(d));
 assert.equal(averageRestSeconds(undefined),null);
 assert.equal(averageRestSeconds([]),null);
 assert.deepEqual(mergeWorkoutRests(undefined,[rest(0,45)]),[rest(0,45)]);
 assert.equal(migrate(structuredClone(d)).logs[0].workoutRests,undefined);
});

test('다른 기기가 본문만 바꾸고 로컬이 휴식만 추가하면 필드를 합친다',()=>{
 const basePayload=workoutLog({text:'원본'});
 const base= {item_key:itemKey('logs','w1'),payload:basePayload,version:1,deleted:false,mutation_id:'m1'};
 const local=emptyState();
 local.logs=[workoutLog({text:'원본',workoutRests:[rest(0,88)]})];
 const remote={[base.item_key]:{...base,version:2,payload:workoutLog({text:'원격 수정'}),mutation_id:'m2'}};
 const merged=reconcile(local,{[base.item_key]:base},remote);
 assert.equal(merged.conflicts.length,0);
 assert.equal(merged.state.logs[0].text,'원격 수정');
 assert.deepEqual(merged.state.logs[0].workoutRests,[rest(0,88)]);
});

test('같은 기록의 workoutRests를 서로 다르게 바꾸면 충돌로 남기고 로컬을 유지한다',()=>{
 const basePayload=workoutLog({text:'원본',workoutRests:[rest(0,60)]});
 const base={item_key:itemKey('logs','w1'),payload:basePayload,version:1,deleted:false,mutation_id:'m1'};
 const local=emptyState();
 local.logs=[workoutLog({text:'원본',workoutRests:[rest(0,60),rest(0,70)]})];
 const remote={[base.item_key]:{...base,version:2,payload:workoutLog({text:'원본',workoutRests:[rest(0,60),rest(1,90)]}),mutation_id:'m2'}};
 const merged=reconcile(local,{[base.item_key]:base},remote);
 assert.equal(merged.conflicts.length,1);
 assert.equal(merged.state.logs[0].workoutRests.length,2);
 assert.equal(merged.state.logs[0].workoutRests[1].itemIndex,0);
 assert.equal(merged.state.logs[0].workoutRests[1].seconds,70);
});

test('화면에 휴식 없던 삭제 버튼은 최신 workoutRests가 붙은 기록을 지우지 않는다',()=>{
 const painted=workoutLog();
 const live=workoutLog({workoutRests:[rest(0,75)]});
 const logs=[live];
 assert.throws(()=>assertRecordUnchanged(live,painted),/다른 기기나 화면에서 바뀐 기록/);
 assert.throws(()=>removeUnchangedItem(logs,'w1',painted),/다른 기기나 화면에서 바뀐 기록/);
 assert.equal(logs.length,1);
 assert.deepEqual(logs[0].workoutRests,[rest(0,75)]);
});

test('캡처 초안 workoutRests는 직렬화·복원되고 세트 완료 표시는 저장하지 않는다',()=>{
 const drafts={'2026-11-08':{text:'랫풀다운 40 12 3',kind:'운동',mode:'activity',workoutPlan:'랫풀다운 40 12 3',workoutSetDone:{'0:0':true},workoutRests:[rest(0,92)]}};
 const raw=serializeCaptureDrafts(drafts);
 assert.doesNotMatch(raw,/workoutSetDone/);
 assert.match(raw,/workoutRests/);
 const restored=restoreCaptureDrafts(raw);
 assert.deepEqual(restored['2026-11-08'].workoutRests,[rest(0,92)]);
 assert.equal(restored['2026-11-08'].workoutSetDone,undefined);
 const scrubbed=restoreCaptureDrafts(JSON.stringify({'2026-11-08':{text:'x',kind:'운동',workoutRests:[{itemIndex:0,seconds:-1,endedAt:1}]}}));
 assert.equal(scrubbed['2026-11-08'].workoutRests,undefined);
});

test('app 휴식 저장·계정 전환 가져오기 방어 배선이 유지된다',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.ok(app.includes('onRestCompleted:payload=>queueMicrotask(()=>persistMeasuredRest(payload))'));
 assert.ok(app.includes('log.workoutRests=appendWorkoutRest(log.workoutRests,entry)'));
 assert.ok(app.includes("l.id===current.logId&&l.kind==='운동'&&!l.sourceId"));
 assert.ok(app.includes("assertBackupOwner(importKey,key,'불러오기')"));
 assert.ok(app.includes("계정이 바뀌어 가져오기를 중단했어요."));
 assert.ok(app.includes('기존 기록은 변경하지 않았어요.'));
 assert.ok(app.includes('importCommitOutcome({saved,mode})'));
 assert.ok(app.includes('withImportedPhotos(store,photos,async keep=>{'));
 assert.ok(app.includes('withImportedPhotos(targetStore,photos,async keep=>{'));
 assert.match(app,/setItem\(importKey,JSON\.stringify\(incoming\)\);keep\(\)/);
 assert.match(app,/importCommitOutcome\(\{saved,mode\}\);keep\(\)/);
 assert.match(app,/가져오지 못했어요\.'\);keep\(\)/);
 assert.ok(app.includes('decodePhotoBundle(payload.photoData,collectPhotoRefs(incoming))'));
});
