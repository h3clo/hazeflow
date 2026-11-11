import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,activityIntervals,validateBackup} from '../domain.js';
import {
 shouldConfirmOngoingStart,
 resolveOngoingEndChoices,
 applyOngoingEnds,
 captureTimingFields
} from '../activity-start-confirm.js';
import {independentTimingFields,finishActivityFields} from '../activity-timing.js';

const now=new Date('2026-11-10T15:00:00');
const indie=(id,time)=>({id,date:'2026-11-10',time,kind:'일상',text:id,...independentTimingFields()});

test('활동 시작만 진행 중 확인이 필요하고 짧은 기록은 묻지 않는다',()=>{
 assert.equal(shouldConfirmOngoingStart('activity',2),true);
 assert.equal(shouldConfirmOngoingStart('activity',0),false);
 assert.equal(shouldConfirmOngoingStart('memo',3),false);
});

test('선택하지 않은 진행 중 활동은 종료 목록에 넣지 않는다',()=>{
 assert.deepEqual(resolveOngoingEndChoices(['a','b','c'],['b']),{endIds:['b'],keepIds:['a','c']});
 assert.deepEqual(resolveOngoingEndChoices(['a','b'],['x','a']),{endIds:['a'],keepIds:['b']});
 assert.deepEqual(resolveOngoingEndChoices(['a'],[]),{endIds:[],keepIds:['a']});
});

test('선택한 활동만 명시 종료하고 나머지는 독립 ongoing으로 남긴다',()=>{
 const d=emptyState();
 d.logs=[indie('keep','10:00'),indie('end','11:00')];
 applyOngoingEnds(d.logs,['end'],new Date('2026-11-10T12:00:00'));
 d.logs.push({id:'new',...indie('new','12:05')});
 const m=activityIntervals(d,now);
 assert.equal(m.get('keep').ongoing,true);
 assert.equal(m.get('end').ongoing,false);
 assert.equal(m.get('end').endTime,'12:00');
 assert.equal(m.get('new').ongoing,true);
 assert.equal(m.get('new').timing,'independent');
});

test('이미 끝난 활동에 종료를 다시 쓰지 않는다',()=>{
 const d=emptyState();
 d.logs=[{...indie('done','09:00'),endDate:'2026-11-10',endTime:'09:30'}];
 applyOngoingEnds(d.logs,['done'],new Date('2026-11-10T12:00:00'));
 assert.equal(d.logs[0].endTime,'09:30');
});

test('새 활동 캡처 필드는 activity에만 independent를 붙인다',()=>{
 assert.deepEqual(captureTimingFields('activity'),independentTimingFields());
 assert.deepEqual(captureTimingFields('memo'),{});
 assert.equal(validateBackup({...emptyState(),logs:[{id:'n',date:'2026-11-10',time:'10:00',kind:'일상',text:'x',...captureTimingFields('activity')}]}).logs[0].activityTiming,'independent');
});

test('finishActivityFields와 applyOngoingEnds가 같은 종료 형태를 쓴다',()=>{
 const at=new Date('2026-11-10T13:15:00');
 const d=emptyState();
 d.logs=[indie('a','12:00')];
 applyOngoingEnds(d.logs,['a'],at);
 assert.equal(d.logs[0].endDate,finishActivityFields(at).endDate);
 assert.equal(d.logs[0].endTime,finishActivityFields(at).endTime);
 assert.equal(d.logs[0].endedAt,at.toISOString());
});
