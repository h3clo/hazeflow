import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,activityIntervals,validateBackup,mergeBackup,activityTimeLabel} from '../domain.js';
import {
 ongoingActivities,
 finishActivityFields,
 sumActivityMinutes,
 mergedElapsedMinutes,
 independentTimingFields,
 isIndependentTiming
} from '../activity-timing.js';
import {flattenState,unflattenState} from '../sync-state.js';
import {shouldKeepRestTimer} from '../rest-timer.js';

const now=new Date('2026-11-10T15:00:00');
const log=(id,time,extra={})=>({id,date:'2026-11-10',time,kind:'일상',text:id,...extra});
const independent=(id,time,extra={})=>({...log(id,time,extra),...independentTimingFields()});

test('기존 레거시만 있으면 다음 시작으로 종료를 추론하고 표시가 바뀌지 않는다',()=>{
 const d=emptyState();
 d.logs=[log('a','12:00'),log('b','12:40')];
 const m=activityIntervals(d,now);
 assert.equal(m.get('a').endTime,'12:40');
 assert.equal(m.get('a').minutes,40);
 assert.equal(m.get('a').automatic,true);
 assert.equal(m.get('a').timing,'legacy');
 assert.equal(m.get('b').ongoing,true);
 assert.equal(m.get('b').automatic,true);
 assert.match(activityTimeLabel(d.logs[0],m.get('a')),/12:00 ~ 12:40 · 40분/);
});

test('독립 활동 2개 이상은 동시 진행 중으로 남는다',()=>{
 const d=emptyState();
 d.logs=[independent('read','10:00'),independent('study','11:00')];
 const m=activityIntervals(d,now);
 assert.equal(m.get('read').ongoing,true);
 assert.equal(m.get('study').ongoing,true);
 assert.equal(m.get('read').automatic,false);
 assert.equal(m.get('study').timing,'independent');
 assert.equal(ongoingActivities(d,now).map(x=>x.log.id).join(','),'read,study');
});

test('독립 활동 하나만 종료해도 나머지는 진행을 유지한다',()=>{
 const d=emptyState();
 d.logs=[independent('read','10:00'),independent('study','11:00')];
 Object.assign(d.logs[0],finishActivityFields(new Date('2026-11-10T12:00:00')));
 const m=activityIntervals(d,now);
 assert.equal(m.get('read').ongoing,false);
 assert.equal(m.get('read').endTime,'12:00');
 assert.equal(m.get('study').ongoing,true);
 assert.equal(ongoingActivities(d,now).map(x=>x.log.id).join(','),'study');
});

test('신규 독립 기록 추가가 레거시 추론 종료를 바꾸지 않는다',()=>{
 const d=emptyState();
 d.logs=[log('legacyA','09:00'),log('legacyB','10:00')];
 const before=structuredClone(activityIntervals(d,now).get('legacyA'));
 d.logs.push(independent('new','09:30'));
 d.logs.push(independent('later','12:00'));
 const after=activityIntervals(d,now);
 assert.equal(after.get('legacyA').endTime,before.endTime);
 assert.equal(after.get('legacyA').minutes,before.minutes);
 assert.equal(after.get('legacyA').automatic,true);
 assert.equal(after.get('legacyB').ongoing,true);
 assert.equal(after.get('new').ongoing,true);
 assert.equal(after.get('later').ongoing,true);
});

test('레거시 진행 중 뒤에 독립 활동을 넣어도 레거시는 진행 중으로 남는다',()=>{
 const d=emptyState();
 d.logs=[log('legacyOpen','08:00')];
 assert.equal(activityIntervals(d,now).get('legacyOpen').ongoing,true);
 d.logs.push(independent('indie','14:00'));
 const m=activityIntervals(d,now);
 assert.equal(m.get('legacyOpen').ongoing,true);
 assert.equal(m.get('indie').ongoing,true);
 assert.equal(m.get('legacyOpen').endTime,'');
});

test('날짜를 넘기는 독립·레거시 활동을 각각 계산한다',()=>{
 const d=emptyState();
 d.logs=[
  log('legacyNight','23:30',{date:'2026-11-09'}),
  log('legacyMorning','00:15'),
  independent('indieNight','23:00',{date:'2026-11-09'}),
  independent('indieDay','01:00',{endDate:'2026-11-10',endTime:'02:00'})
 ];
 const m=activityIntervals(d,now);
 assert.equal(m.get('legacyNight').endTime,'00:15');
 assert.equal(m.get('legacyNight').minutes,45);
 assert.equal(m.get('legacyMorning').ongoing,true);
 assert.equal(m.get('indieNight').ongoing,true);
 assert.equal(m.get('indieDay').ongoing,false);
 assert.equal(m.get('indieDay').minutes,60);
});

test('명시 종료와 레거시 자동 추론 종료를 구분한다',()=>{
 const d=emptyState();
 d.logs=[
  log('explicit','09:00',{endDate:'2026-11-10',endTime:'09:20'}),
  log('chained','09:30'),
  log('tail','10:00'),
  independent('indieOpen','09:40'),
  independent('indieDone','09:50',{endDate:'2026-11-10',endTime:'10:10'})
 ];
 const m=activityIntervals(d,now);
 assert.equal(m.get('explicit').automatic,false);
 assert.equal(m.get('explicit').endTime,'09:20');
 assert.equal(m.get('chained').automatic,true);
 assert.equal(m.get('chained').endTime,'10:00');
 assert.equal(m.get('indieOpen').automatic,false);
 assert.equal(m.get('indieOpen').ongoing,true);
 assert.equal(m.get('indieDone').automatic,false);
 assert.equal(m.get('indieDone').endTime,'10:10');
});

test('활동별 합산과 겹친 실제 경과(병합)를 따로 계산한다',()=>{
 const d=emptyState();
 d.logs=[
  independent('a','10:00',{endDate:'2026-11-10',endTime:'11:00'}),
  independent('b','10:30',{endDate:'2026-11-10',endTime:'11:30'})
 ];
 const m=activityIntervals(d,now);
 assert.equal(sumActivityMinutes(m),120);
 assert.equal(mergedElapsedMinutes(m,now),90);
});

test('백업·복원·동기화 flatten에서 기록별 activityTiming을 보존한다',()=>{
 const d=emptyState();
 d.logs=[log('legacy','09:00'),independent('indie','10:00',{endDate:'2026-11-10',endTime:'10:30'})];
 const validated=validateBackup(structuredClone(d));
 assert.equal(validated.logs.find(l=>l.id==='indie').activityTiming,'independent');
 assert.equal(validated.logs.find(l=>l.id==='legacy').activityTiming,undefined);
 const round=unflattenState(flattenState(validated));
 assert.equal(round.logs.find(l=>l.id==='indie').activityTiming,'independent');
 const merged=mergeBackup(emptyState(),validated);
 assert.equal(merged.logs.find(l=>l.id==='indie').activityTiming,'independent');
 assert.equal(activityIntervals(merged,now).get('legacy').ongoing,true);
 assert.throws(()=>validateBackup({...d,logs:[{...independent('bad','10:00'),activityTiming:'legacy'}]}));
});

test('운동 세션 휴식 타이머는 해당 기록 ongoing만 본다(독립 공존 회귀)',()=>{
 const d=emptyState();
 d.logs=[
  {...independent('w1','10:00'),kind:'운동',text:'스쿼트 60 8 3'},
  {...independent('w2','11:00'),kind:'운동',text:'벤치 40 8 3'}
 ];
 Object.assign(d.logs[0],finishActivityFields(new Date('2026-11-10T10:40:00')));
 const intervals=activityIntervals(d,now);
 assert.equal(shouldKeepRestTimer({source:'log',logId:'w1',itemIndex:0},intervals),false);
 assert.equal(shouldKeepRestTimer({source:'log',logId:'w2',itemIndex:0},intervals),true);
});

test('schemaVersion은 2를 유지하고 전역 v3 없이 기록 플래그만 쓴다',()=>{
 const d=emptyState();
 d.logs=[independent('a','10:00')];
 assert.equal(validateBackup(d).schemaVersion,2);
 assert.equal(isIndependentTiming(d.logs[0]),true);
 assert.equal(isIndependentTiming(log('b','10:00')),false);
});
