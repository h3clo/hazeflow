import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../domain.js';
import {setPrimaryPreference} from '../activity-primary.js';
import {createWatchSnapshotGate} from '../watch-snapshot.js';

const now=new Date('2026-11-12T10:00:00');

function activity(id,text,time='09:00'){
 const state=emptyState();
 state.logs.push({id,date:'2026-11-12',time,kind:'일상',text,activityTiming:'independent'});
 return state;
}

function gate(){
 const sent=[];
 return {sent,gate:createWatchSnapshotGate({send(command){sent.push(command);return command;}})};
}

test('계정 로드 전에는 메모리의 활동을 보내지 않는다',()=>{
 const {sent,gate:watch}=gate();
 watch.hold();
 watch.publish(activity('old','이전 계정'),'old',now);
 assert.deepEqual(sent.map(item=>item.phase),['pending','pending']);
 assert.equal(sent.some(item=>item.recordId==='old'),false);
});

test('계정 로드 뒤에는 그 계정의 대표 활동을 보낸다',()=>{
 const {sent,gate:watch}=gate();
 watch.hold();
 const current=activity('now','연습 활동');
 watch.release(current,'now',now);
 assert.equal(sent[0].phase,'pending');
 assert.equal(sent[1].phase,'ready');
 assert.equal(sent[1].recordId,'now');
 assert.equal(sent[1].title,'연습 활동');
});

test('계정 전환은 이전 스냅샷을 지운 뒤에 새 계정만 보낸다',()=>{
 const {sent,gate:watch}=gate();
 watch.release(activity('first','첫 계정'),'first',now);
 watch.hold();
 watch.publish(activity('first','첫 계정'),'first',now);
 watch.release(activity('second','둘째 계정'),'second',now);
 assert.equal(sent[1].phase,'pending');
 assert.equal(sent[2].phase,'pending');
 assert.equal(sent[3].recordId,'second');
 assert.equal(sent.filter(item=>item.phase==='ready'&&item.recordId==='first').length,1);
});

test('로그아웃 대기 중에는 이전 활동을 다시 보내지 않는다',()=>{
 const {sent,gate:watch}=gate();
 watch.release(activity('secret','이전 계정'),'secret',now);
 watch.hold();
 watch.publish(activity('secret','이전 계정'),'secret',now);
 assert.equal(sent.at(-1).phase,'pending');
 assert.equal(sent.at(-1).recordId,undefined);
});

test('시작·종료·대표 변경은 준비된 뒤에만 스냅샷을 바꾼다',()=>{
 const {sent,gate:watch}=gate();
 const state=emptyState();
 state.logs.push(
  {id:'early',date:'2026-11-12',time:'09:00',kind:'일상',text:'먼저',activityTiming:'independent'},
  {id:'late',date:'2026-11-12',time:'09:30',kind:'일상',text:'나중',activityTiming:'independent'}
 );
 watch.hold();
 watch.publish(state,'late',now);
 watch.release(state,'early',now);
 setPrimaryPreference(state,'late',{at:2,deviceId:'phone'});
 watch.publish(state,'late',now);
 state.logs.forEach(log=>{log.endDate='2026-11-12';log.endTime='10:00';});
 watch.publish(state,'late',now);
 assert.equal(sent[1].phase,'pending');
 assert.equal(sent[2].recordId,'early');
 assert.equal(sent[3].recordId,'late');
 assert.equal(sent[4].end,true);
 assert.equal(sent[4].phase,'ready');
});

test('재시작은 다시 대기했다가 현재 계정 스냅샷으로 돌아온다',()=>{
 const first=gate();
 first.gate.release(activity('kept','연습 활동'),'kept',now);
 const restarted=gate();
 restarted.gate.hold();
 restarted.gate.publish(activity('kept','연습 활동'),'kept',now);
 restarted.gate.release(activity('kept','연습 활동'),'kept',now);
 assert.deepEqual(restarted.sent.map(item=>item.phase),['pending','pending','ready']);
 assert.equal(restarted.sent.at(-1).recordId,'kept');
});

test('다시 연결되면 준비 상태에 맞는 스냅샷만 답한다',()=>{
 const {sent,gate:watch}=gate();
 watch.hold();
 watch.publish(activity('old','이전'),'old',now);
 watch.release(activity('current','현재'),'current',now);
 watch.publish(activity('current','현재'),'current',now);
 assert.equal(sent[0].phase,'pending');
 assert.equal(sent.at(-1).recordId,'current');
 assert.equal(sent.some(item=>item.recordId==='old'),false);
});
