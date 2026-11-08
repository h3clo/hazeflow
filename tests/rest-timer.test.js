import test from 'node:test';
import assert from 'node:assert/strict';
import {remainingSeconds,elapsedSeconds,formatRestClock,normalizeRestAnchor,sameRestAnchor,restPrimaryControl,restModeAfterStartNext,shouldKeepRestTimer,captureRestAfterSave,restoreRestSession,readSetDoneMap,pruneSetDoneMap} from '../rest-timer.js';

test('휴식 시간은 종료시각 기준이라 화면을 떠나도 오차가 누적되지 않는다',()=>{
 assert.equal(remainingSeconds(61000,1000),60);
 assert.equal(remainingSeconds(61000,60500),1);
 assert.equal(remainingSeconds(61000,90000),0);
 assert.equal(remainingSeconds(NaN,1000),0);
 assert.equal(elapsedSeconds(1000,61000),60);
 assert.equal(elapsedSeconds(1000,1500),0);
 assert.equal(elapsedSeconds(NaN,1000),0);
 assert.equal(formatRestClock(84),'01:24');
 assert.equal(formatRestClock(5),'00:05');
 assert.equal(formatRestClock(-1),'00:00');
});

test('휴식 앵커는 종목 카드에만 붙이고 서로 다른 종목과 섞지 않는다',()=>{
 assert.deepEqual(normalizeRestAnchor({source:'log',logId:'a',itemIndex:2}),{source:'log',logId:'a',itemIndex:2});
 assert.equal(normalizeRestAnchor({source:'capture',itemIndex:-1}),null);
 assert.equal(sameRestAnchor({source:'log',logId:'a',itemIndex:1},{source:'log',logId:'a',itemIndex:1}),true);
 assert.equal(sameRestAnchor({source:'log',logId:'a',itemIndex:1},{source:'log',logId:'a',itemIndex:2}),false);
 assert.equal(sameRestAnchor({source:'capture',logId:'',itemIndex:0},{source:'log',logId:'',itemIndex:0}),false);
});

test('다음 세트 시작 후 같은 자리 버튼이 세트 완료로 바뀐다',()=>{
 assert.equal(restModeAfterStartNext(true),'ready');
 assert.equal(restModeAfterStartNext(false),'idle');
 assert.deepEqual(restPrimaryControl('ready'),{action:'complete-set',label:'세트 완료'});
 assert.deepEqual(restPrimaryControl('elapsed'),{action:'start-next',label:'다음 세트 시작'});
 assert.deepEqual(restPrimaryControl('countdown'),{action:'start-next',label:'다음 세트 시작'});
});

test('활동이 끝나면 해당 종목 휴식 타이머를 유지하지 않는다',()=>{
 const intervals=new Map([['w1',{ongoing:true}],['w2',{ongoing:false}]]);
 assert.equal(shouldKeepRestTimer({source:'log',logId:'w1',itemIndex:0},intervals),true);
 assert.equal(shouldKeepRestTimer({source:'log',logId:'w2',itemIndex:0},intervals),false);
 assert.equal(shouldKeepRestTimer({source:'capture',logId:'',itemIndex:0},intervals),true);
 assert.equal(shouldKeepRestTimer({source:'capture',logId:'',itemIndex:0},intervals,false),false);
 assert.equal(shouldKeepRestTimer(null,intervals),false);
});

test('캡처 초안을 저장하면 진행 중 근력만 새 기록으로 휴식을 옮긴다',()=>{
 const anchor={source:'capture',logId:'',itemIndex:0};
 assert.equal(captureRestAfterSave({anchor,kind:'운동',mode:'activity',ended:false,itemKind:'strength'}),'retarget');
 assert.equal(captureRestAfterSave({anchor,kind:'운동',mode:'activity',ended:true,itemKind:'strength'}),'stop');
 assert.equal(captureRestAfterSave({anchor,kind:'운동',mode:'memo',ended:false,itemKind:'strength'}),'stop');
 assert.equal(captureRestAfterSave({anchor,kind:'일상',mode:'activity',ended:false,itemKind:'strength'}),'stop');
 assert.equal(captureRestAfterSave({anchor,kind:'운동',mode:'activity',ended:false,itemKind:'cardio'}),'stop');
 assert.equal(captureRestAfterSave({anchor:{source:'log',logId:'w1',itemIndex:0},kind:'운동',mode:'activity',ended:true,itemKind:'strength'}),'keep');
});

test('같은 탭을 새로고침하면 경과 휴식과 세트 완료 대기가 남고 끝난 목표 휴식은 사라진다',()=>{
 const anchor={source:'log',logId:'w1',itemIndex:0},now=1_000_000;
 assert.equal(restoreRestSession({mode:'countdown',deadline:now-1,anchor},now),null);
 assert.deepEqual(restoreRestSession({mode:'elapsed',startedAt:now-5000,anchor},now),{mode:'elapsed',startedAt:now-5000,deadline:0,targetSeconds:0,anchor,readyRestSeconds:0});
 assert.equal(restoreRestSession({mode:'ready',readyRestSeconds:42,anchor},now).mode,'ready');
 assert.equal(restoreRestSession({mode:'ready',readyRestSeconds:42,anchor},now).readyRestSeconds,42);
 assert.equal(restoreRestSession({mode:'ready',readyRestSeconds:-1,anchor},now),null);
});

test('세트 완료 표시는 진행 중 기록만 남기고 백업 필드가 아니다',()=>{
 const map={'w1:0:0':true,'w2:1:0':true,'bad':true};
 assert.deepEqual(readSetDoneMap(map),{'w1:0:0':true,'w2:1:0':true});
 assert.deepEqual(pruneSetDoneMap(map,['w1']),{'w1:0:0':true});
 assert.deepEqual(pruneSetDoneMap(null,['w1']),{});
});
