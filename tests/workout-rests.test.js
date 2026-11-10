import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {appendWorkoutRest,averageRestSeconds,mergeWorkoutRests,normalizeWorkoutRest,validWorkoutRests} from '../workout-rests.js';

test('세트 사이 휴식은 계산된 초만 받고 수동 입력 필드를 쓰지 않는다',()=>{
 const row=normalizeWorkoutRest({itemIndex:0,seconds:97.8,endedAt:1_700_000_000_000});
 assert.deepEqual(row,{itemIndex:0,seconds:97,endedAt:1_700_000_000_000});
 assert.equal(normalizeWorkoutRest({itemIndex:0,seconds:0,endedAt:1}),null);
 assert.equal(normalizeWorkoutRest({itemIndex:-1,seconds:10,endedAt:1}),null);
 assert.equal(validWorkoutRests([{itemIndex:0,seconds:90,endedAt:1}]),true);
 assert.equal(validWorkoutRests([{itemIndex:0,seconds:0,endedAt:1}]),false);
});

test('휴식 기록을 이어 붙이고 평균을 낸다',()=>{
 const one=appendWorkoutRest([],{itemIndex:0,seconds:60,endedAt:10});
 const two=appendWorkoutRest(one,{itemIndex:0,seconds:120,endedAt:20});
 assert.equal(two.length,2);
 assert.equal(averageRestSeconds(two),90);
 assert.equal(mergeWorkoutRests(one,[{itemIndex:1,seconds:30,endedAt:30}]).length,2);
});

test('다음 세트 시작 시 경과 휴식을 기록에 붙이도록 연결한다',()=>{
 const rest=readFileSync(new URL('../rest-timer.js',import.meta.url),'utf8');
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.ok(rest.includes('onRestCompleted'));
 assert.ok(rest.includes('emitCompletedRest'));
 assert.ok(app.includes('persistMeasuredRest'));
 assert.ok(app.includes('workoutRests'));
 assert.ok(app.includes('workout-rests-summary'));
});
