import test from 'node:test';
import assert from 'node:assert/strict';
import {
 workoutItems,serializeWorkoutItems,updateStrengthSet,addStrengthSet,removeStrengthSet,
 appendWorkoutLine,formatStrengthSets,applyPlanGoals,snapshotWorkoutPlan,nextIncompleteSetIndex
} from '../workout-sets.js';
import {workoutSession} from '../workout.js';

test('같은 횟수 묶음과 세트별 다른 횟수를 동일 모델로 읽고 다시 쓴다',()=>{
 const grouped=workoutItems('어시스트 풀업 55 15 3');
 assert.equal(grouped.length,1);
 assert.equal(grouped[0].sets.length,3);
 assert.deepEqual(grouped[0].sets[0],{kg:55,reps:15});
 const diverged=updateStrengthSet(grouped,0,2,{reps:12});
 assert.equal(serializeWorkoutItems(diverged),'어시스트 풀업 55 15 2\n어시스트 풀업 55 12 1');
 const again=workoutItems(serializeWorkoutItems(diverged));
 assert.equal(again[0].sets[2].reps,12);
 assert.equal(again[0].sets.length,3);
});

test('0kg·보조중량·유산소·메모를 보존하고 한 세트만 바꿔도 다른 종목은 유지한다',()=>{
 const text='워밍업\n힙어브덕션 0 12 3\n어시스트풀업 50 8 3\n러닝머신 5 10\n체스트프레스 40 10 3';
 const items=workoutItems(text);
 const next=updateStrengthSet(items,2,1,{reps:6});
 const out=serializeWorkoutItems(next);
 assert.match(out,/^워밍업$/m);
 assert.match(out,/힙어브덕션 0 12 3/);
 assert.match(out,/어시스트풀업 50 8 1\n어시스트풀업 50 6 1\n어시스트풀업 50 8 1/);
 assert.match(out,/러닝머신 5 10/);
 assert.match(out,/체스트프레스 40 10 3/);
 assert.equal(workoutSession(out).cardioMinutes,10);
 assert.equal(workoutSession(out).exercises.filter(r=>r.key==='힙어브덕션')[0].kg,0);
});

test('새 운동 한 줄을 붙일 때 기존 원문을 다시 쓰지 않는다',()=>{
 const base='레그프레스 25 10 3';
 const next=appendWorkoutLine(base,'러닝머신 3.5 5');
 assert.equal(next,'레그프레스 25 10 3\n러닝머신 3.5 5');
 assert.throws(()=>appendWorkoutLine(base,'그냥 메모'));
});

test('연속으로 종목을 붙여도 앞선 세트 기록이 유지된다',()=>{
 const first=appendWorkoutLine('랫풀다운 20 10 3','체스트프레스 40 10 3');
 const second=appendWorkoutLine(first,'러닝머신 5 5');
 assert.equal(second,'랫풀다운 20 10 3\n체스트프레스 40 10 3\n러닝머신 5 5');
 const items=workoutItems(second);
 assert.equal(items[0].sets.length,3);
 assert.equal(items[0].sets[0].kg,20);
 assert.equal(items[1].name,'체스트프레스');
 assert.throws(()=>appendWorkoutLine(second,'   '));
});

test('세트 추가·삭제와 목표 스냅샷을 유지한다',()=>{
 const items=workoutItems('랫풀다운 15 15 2');
 const added=addStrengthSet(items,0);
 assert.equal(added[0].sets.length,3);
 const removed=removeStrengthSet(added,0,1);
 assert.equal(removed[0].sets.length,2);
 assert.equal(formatStrengthSets('랫풀다운',removed[0].sets),'랫풀다운 15 15 2');
 const plan=snapshotWorkoutPlan('','랫풀다운 15 15 3');
 assert.equal(snapshotWorkoutPlan(plan,'랫풀다운 15 15 2\n랫풀다운 15 12 1'),plan);
 const withGoals=applyPlanGoals(workoutItems('랫풀다운 15 15 2\n랫풀다운 15 12 1'),plan);
 assert.equal(withGoals[0].goalSets,3);
 assert.equal(withGoals[0].goalReps,15);
});

test('일괄 등록 후 한 줄 추가·중간 수정·순서 무시가 가능하고 완료로 강제하지 않는다',()=>{
 // Busy gym: warm up first, then add machines as they free up. Quiet gym: paste several lines at once.
 const batch='러닝머신 5.5 5\n랫풀다운 20 10 3\n체스트프레스 40 10 3';
 const items=workoutItems(batch);
 assert.equal(items.length,3);
 assert.equal(items[0].kind,'cardio');
 assert.equal(items[1].sets.length,3);
 // Out of registered order: edit chest first while lat pull stays untouched.
 const mid=updateStrengthSet(items,2,0,{reps:8});
 assert.equal(mid[1].sets[0].reps,10);
 assert.equal(mid[2].sets[0].reps,8);
 // Append another exercise later without rewriting earlier lines or inventing done flags.
 const later=appendWorkoutLine(serializeWorkoutItems(mid),'레그프레스 25 10 3');
 assert.equal(later.split('\n').length,5);
 const again=workoutItems(later);
 assert.equal(again.length,4);
 assert.equal(again[1].name,'랫풀다운');
 assert.equal(again.every(item=>!item.sets||item.sets.every(set=>set.done===undefined)),true);
 // Goals stay on the frozen plan snapshot; actual text can diverge without schema change.
 const plan=snapshotWorkoutPlan('',batch);
 const afterMore=appendWorkoutLine(batch,'힙어브덕션 0 12 3');
 assert.equal(snapshotWorkoutPlan(plan,afterMore),plan);
 const labeled=applyPlanGoals(workoutItems(afterMore),plan);
 assert.equal(labeled[1].planLabel,'랫풀다운 20 10 3');
 assert.equal(labeled[3].planLabel,undefined);
});

test('같은 자리 세트 완료는 해당 종목의 첫 미완료 세트만 고른다',()=>{
 const items=workoutItems('랫풀다운 20 10 3\n체스트프레스 40 8 2');
 assert.equal(nextIncompleteSetIndex(items,{},0),0);
 assert.equal(nextIncompleteSetIndex(items,{'0:0':true},0),1);
 assert.equal(nextIncompleteSetIndex(items,{'0:0':true,'0:1':true,'0:2':true},0),null);
 assert.equal(nextIncompleteSetIndex(items,{'0:0':true},1),0);
 assert.equal(nextIncompleteSetIndex(items,{'1:0':true},1),1);
});
