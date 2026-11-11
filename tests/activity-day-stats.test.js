import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,activityIntervals,dayActivityStats,validateBackup} from '../domain.js';
import {flattenState,unflattenState} from '../sync-state.js';
import {
 independentTimingFields,
 isLongRunning,
 longRunNeedsConfirm,
 longRunAckFields,
 preservedInstant,
 zonedDateTime,
 LONG_ACTIVITY_MS
} from '../activity-timing.js';

const zone='Asia/Seoul';
const indie=(id,startKey,startTime,endKey,endTime,text)=>({
 id,date:startKey,time:startTime,kind:'일상',text,
 endDate:endKey,endTime,
 startedAt:zonedDateTime(startKey,startTime,zone).toISOString(),
 endedAt:zonedDateTime(endKey,endTime,zone).toISOString(),
 ...independentTimingFields()
});

test('자정을 넘긴 활동은 기록 하나이고 날짜마다 실제 분만 센다',()=>{
 const d=emptyState();
 d.logs=[indie('night','2026-11-11','23:00','2026-11-12','01:30','연습 활동')];
 const intervals=activityIntervals(d,new Date('2026-11-12T03:00:00+09:00'));
 assert.equal(d.logs.length,1);
 assert.equal(intervals.get('night').minutes,150);
 assert.deepEqual(dayActivityStats(intervals,'2026-11-11',intervals.get('night').end,zone),{sumMinutes:60,elapsedMinutes:60});
 assert.deepEqual(dayActivityStats(intervals,'2026-11-12',intervals.get('night').end,zone),{sumMinutes:90,elapsedMinutes:90});
});

test('겹친 활동은 누적과 실제 경과를 따로 센다',()=>{
 const d=emptyState();
 d.logs=[
  indie('focus','2026-11-12','14:00','2026-11-12','16:00','연습 활동'),
  indie('music','2026-11-12','15:00','2026-11-12','16:00','연습 음악')
 ];
 const stats=dayActivityStats(activityIntervals(d), '2026-11-12', new Date('2026-11-12T18:00:00+09:00'), zone);
 assert.equal(stats.sumMinutes,180);
 assert.equal(stats.elapsedMinutes,120);
});

test('실제 경과는 하루 24시간을 넘기지 않는다',()=>{
 const d=emptyState();
 const start=zonedDateTime('2026-11-01','00:00','America/New_York');
 const end=zonedDateTime('2026-11-02','00:00','America/New_York');
 d.logs=[{id:'long',date:'2026-11-01',time:'00:00',kind:'일상',text:'연습 활동',endDate:'2026-11-02',endTime:'00:00',startedAt:start.toISOString(),endedAt:end.toISOString(),...independentTimingFields()}];
 const stats=dayActivityStats(activityIntervals(d,end),'2026-11-01',end,'America/New_York');
 assert.ok(end-start>24*60*60*1000);
 assert.equal(stats.sumMinutes,Math.floor((end-start)/60000));
 assert.equal(stats.elapsedMinutes,24*60);
});

test('일광절약시간 전환은 벽시계가 아니라 실제 경과를 쓴다',()=>{
 const d=emptyState();
 const start=zonedDateTime('2026-03-08','01:30','America/New_York');
 const end=zonedDateTime('2026-03-08','03:30','America/New_York');
 d.logs=[{id:'dst',date:'2026-03-08',time:'01:30',kind:'일상',text:'연습 활동',endDate:'2026-03-08',endTime:'03:30',startedAt:start.toISOString(),endedAt:end.toISOString(),...independentTimingFields()}];
 assert.equal(activityIntervals(d,end).get('dst').minutes,60);
 assert.equal(dayActivityStats(activityIntervals(d,end),'2026-03-08',end,'America/New_York').elapsedMinutes,60);
});

test('같은 분으로 수정하면 저장된 절대 시각을 유지한다',()=>{
 const original='2026-11-11T14:00:30.000Z';
 assert.equal(preservedInstant(original,'2026-11-11','23:00','2026-11-11','23:00'),original);
 assert.notEqual(preservedInstant(original,'2026-11-11','23:00','2026-11-11','23:05'),original);
});

test('8시간 경계에서 한 번만 확인하고 기록은 그대로다',()=>{
 const start=new Date('2026-11-12T00:00:00Z');
 const interval={start,ongoing:true,end:null};
 const log={id:'run',text:'연습 활동',startedAt:start.toISOString()};
 assert.equal(isLongRunning(interval,new Date(start.getTime()+LONG_ACTIVITY_MS-1)),false);
 assert.equal(longRunNeedsConfirm(log,interval,new Date(start.getTime()+LONG_ACTIVITY_MS)),true);
 const acked={...log,...longRunAckFields(new Date(start.getTime()+LONG_ACTIVITY_MS))};
 assert.equal(longRunNeedsConfirm(acked,interval,new Date(start.getTime()+LONG_ACTIVITY_MS+60000)),false);
 assert.equal(acked.endDate,undefined);
 const saved=validateBackup({...emptyState(),logs:[{id:'run',date:'2026-11-12',time:'09:00',kind:'일상',text:'연습 활동',...independentTimingFields(),...longRunAckFields(start)}]});
 assert.equal(unflattenState(flattenState(saved)).logs[0].longRunAckAt,start.toISOString());
});
