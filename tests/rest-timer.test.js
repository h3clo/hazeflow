import test from 'node:test';
import assert from 'node:assert/strict';
import {remainingSeconds,elapsedSeconds,formatRestClock,normalizeRestAnchor,sameRestAnchor} from '../rest-timer.js';

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
