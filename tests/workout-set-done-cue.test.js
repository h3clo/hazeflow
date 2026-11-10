import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {workoutItems,appendWorkoutLine,shouldContinueRestAfterSet,strengthItemComplete,lastCompletedStrengthIndex} from '../workout-sets.js';

test('종목의 마지막 세트 뒤에는 세트 사이 휴식을 이어가지 않는다',()=>{
 const items=workoutItems('어시스트풀업 55 12 3');
 assert.equal(items[0].sets.length,3);
 assert.equal(shouldContinueRestAfterSet(items,{'0:0':true},0),true);
 assert.equal(shouldContinueRestAfterSet(items,{'0:0':true,'0:1':true},0),true);
 assert.equal(shouldContinueRestAfterSet(items,{'0:0':true,'0:1':true,'0:2':true},0),false);
 assert.equal(strengthItemComplete(items[0],0,{'0:0':true,'0:1':true,'0:2':true}),true);
});

test('마지막 완료 종목 뒤에 다음 운동 추가 큐를 붙인다',()=>{
 const text=appendWorkoutLine('어시스트풀업 55 12 3','체스트프레스 5 12 3');
 const items=workoutItems(text);
 const done={'0:0':true,'0:1':true,'0:2':true};
 assert.equal(lastCompletedStrengthIndex(items,done),0);
 assert.equal(strengthItemComplete(items[1],1,done),false);
});

test('완료 표시는 버튼이 아니고 마지막 세트 뒤에는 휴식을 끊는다',()=>{
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.ok(source.includes('workout-set-done-mark'));
 assert.ok(source.includes('workout-item-finished'));
 assert.ok(source.includes('continueRestAfterSetDone'));
 assert.ok(source.includes("notify('이 종목 세트를 모두 표시했어요. 자극 부위나 다음 운동을 이어서 남겨요.')"));
 assert.ok(!source.includes(">${done?'완료됨':'세트 완료'}</button>"));
 assert.ok(source.includes('restTimer.stop();\n  if(input)input.value='));
});
