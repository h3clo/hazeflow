import test from 'node:test';import assert from 'node:assert/strict';
import {readWorkoutFeedback,validWorkoutFeedback,feelingMusclesState,unionFeelingMuscles} from '../workout-feedback.js';
import {emptyState,validateBackup,dayDocument} from '../domain.js';
import {measurementReview} from '../fitness.js';
test('운동 느낌은 선택값을 검증하고 백업·문서에 원문과 함께 보존한다',()=>{const f=readWorkoutFeedback({effort:'4',soreness:'약함',note:' 등에 잘 들어옴 '},['등']);assert.equal(f.effort,4);assert.throws(()=>readWorkoutFeedback({},[]));assert.equal(validWorkoutFeedback({...f,effort:9}),false);assert.equal(validWorkoutFeedback({...f,muscles:['없는부위']}),false);const d=emptyState();d.logs.push({id:'w',date:'2026-11-01',time:'09:00',kind:'운동',text:'랫풀다운 15 15 3',workoutFeedback:f});assert.deepEqual(validateBackup(d).logs[0].workoutFeedback,f);assert.match(dayDocument(d,'2026-11-01'),/운동 느낌: 자극 등 · 힘듦 4\/5/);assert.throws(()=>validateBackup({...d,logs:[{...d.logs[0],workoutFeedback:{...f,effort:9}}]}))});
test('종목별 자극은 서로 섞이지 않고 합집합만 전체 muscles로 보존한다',()=>{
 const byExercise={all:['등'],'0':['등','이두'],'1':['가슴'],'2':['허벅지']};
 const f=readWorkoutFeedback({effort:'3',soreness:'',note:''},unionFeelingMuscles(byExercise),byExercise);
 assert.deepEqual(feelingMusclesState(f)['2'],['허벅지']);
 assert.equal(f.muscles.includes('가슴'),true);
 assert.equal(feelingMusclesState({muscles:['등','가슴']}).all.join(','),'등,가슴');
 const d=emptyState();
 d.logs.push({id:'multi',date:'2026-11-08',time:'10:00',kind:'운동',text:'어시스트 풀업 55 15 3\n체스트프레스 40 12 3\n런지 20 10 3',workoutFeedback:f});
 assert.deepEqual(validateBackup(d).logs[0].workoutFeedback.exerciseMuscles['2'],['허벅지']);
});
test('인바디 두 측정 사이만 집계하고 체중 단독 입력을 측정으로 오인하지 않는다',()=>{const d=emptyState();d.life={'2026-10-01':{weight:60,muscle:25,fatPercent:25},'2026-10-10':{weight:59},'2026-11-01':{weight:58,muscle:26}};d.logs.push({id:'before',date:'2026-10-01',kind:'운동',text:'랫풀다운 15 15 3'},{id:'between',date:'2026-10-15',kind:'운동',text:'랫풀다운 15 15 3'},{id:'meal',date:'2026-10-15',kind:'식사',text:'점심'},{id:'after',date:'2026-11-02',kind:'운동',text:'랫풀다운 15 15 3'});const r=measurementReview(d,'2026-11-01');assert.equal(r.from,'2026-10-01');assert.equal(r.to,'2026-11-01');assert.equal(r.deltas.weight,-2);assert.equal(r.deltas.muscle,1);assert.equal(r.deltas.fatPercent,null);assert.equal(r.sessions,1);assert.equal(r.sets,3);assert.equal(r.mealDays,1);assert.equal(measurementReview(d,'2026-10-10'),null)});
test('측정 사이 영양정보만 합산하고 미입력과 0 및 중복 식사를 구분한다',()=>{const d=emptyState();d.life={'2026-10-01':{muscle:25},'2026-11-01':{muscle:26}};d.logs=[{id:'old',date:'2026-10-01',kind:'식사',nutrition:{kcal:900}},{id:'a',date:'2026-10-02',kind:'식사',nutrition:{kcal:400,protein:0}},{id:'b',date:'2026-10-03',kind:'식사'},{id:'mirror',date:'2026-10-03',kind:'식사',sourceId:'a',nutrition:{kcal:400}},{id:'future',date:'2026-11-02',kind:'식사',nutrition:{kcal:800}}];const r=measurementReview(d,'2026-11-01');assert.equal(r.nutrition.meals,2);assert.equal(r.nutrition.recorded,1);assert.equal(r.nutrition.totals.kcal,400);assert.equal(r.nutrition.totals.protein,0);assert.equal(r.nutrition.totals.carbs,null);assert.equal(r.nutrition.counts.protein,1)});
