import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,activityIntervals,activityTimeLabel,validateBackup,dayDocument} from '../domain.js';
const log=(id,time,extra={})=>({id,date:'2026-10-31',time,kind:'일상',text:id,...extra});
const now=new Date('2026-10-31T15:00:00');
test('기존 기록을 시간순으로 연결하고 마지막 활동만 진행 중으로 표시한다',()=>{
 const d=emptyState();d.logs=[log('b','12:40'),log('a','12:00')];const before=structuredClone(d),m=activityIntervals(d,now);
 assert.equal(m.get('a').endTime,'12:40');assert.equal(m.get('a').minutes,40);assert.equal(m.get('a').ongoing,false);assert.equal(m.get('b').ongoing,true);assert.equal(m.get('b').minutes,140);assert.deepEqual(d,before);
});
test('메모·실행 로그·시간 없는 기록은 활동을 끊지 않는다',()=>{
 const d=emptyState();d.logs=[log('a','12:00'),log('memo','12:10',{memo:true}),log('event','12:20',{sourceId:'event-start:e'}),log('none','')];const m=activityIntervals(d,now);assert.equal(m.size,1);assert.equal(m.get('a').ongoing,true);
});
test('종료 수정은 유지하고 시간 수정·삭제에 따라 자동 구간을 재계산한다',()=>{
 const d=emptyState();d.logs=[log('a','12:00',{endDate:'2026-10-31',endTime:'12:20'}),log('b','12:40'),log('c','14:00')];assert.equal(activityIntervals(d,now).get('a').endTime,'12:20');d.logs[2].time='13:00';assert.equal(activityIntervals(d,now).get('b').minutes,20);d.logs.pop();assert.equal(activityIntervals(d,now).get('b').ongoing,true);
});
test('자정 넘김과 같은 시각, 미래 시작에서 음수 시간을 만들지 않는다',()=>{
 const d=emptyState();d.logs=[log('a','23:50',{date:'2026-10-30'}),log('b','00:10'),log('c','00:10'),log('future','16:00')];const m=activityIntervals(d,now);assert.equal(m.get('a').minutes,20);assert.equal(m.get('b').minutes,0);assert.equal(m.get('future').ongoing,false);assert.equal(m.get('future').minutes,0);
});
test('백업에 수동 종료와 메모를 보존하고 잘못된 종료를 거부한다',()=>{
 const d=emptyState();d.logs=[log('a','12:00',{endDate:'2026-10-31',endTime:'12:20'}),log('b','13:00',{memo:true})];assert.deepEqual(validateBackup(d).logs,d.logs);d.logs[0].endTime='11:00';assert.throws(()=>validateBackup(d));
});
test('MD에 실제 활동 구간을 포함한다',()=>{
 const d=emptyState();d.logs=[log('a','12:00'),log('b','12:40')];assert.match(dayDocument(d,'2026-10-31'),/12:00 ~ 12:40 · 40분/);assert.match(activityTimeLabel(d.logs[1],activityIntervals(d,now).get('b')),/진행 중/);
});

test('수정 화면을 열어둔 사이 다른 기기에서 종료한 활동을 내용 수정으로 되살리지 않는다',async()=>{
 const {activityEndForEdit}=await import('../domain.js');const current={endDate:'2026-11-02',endTime:'13:00'},submitted={date:'2026-11-02',time:'12:00',mode:'activity',endDate:'',endTime:''};assert.deepEqual(activityEndForEdit(current,submitted,{endDate:'',endTime:''}),current);
 assert.deepEqual(activityEndForEdit(current,submitted,current),{endDate:'',endTime:''});
 assert.throws(()=>activityEndForEdit(current,{...submitted,time:'14:00'},{endDate:'',endTime:''}),/시작/);
});
