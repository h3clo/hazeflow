import test from 'node:test';import assert from 'node:assert/strict';import {emptyState} from '../domain.js';import {strengthCalories,exerciseMuscles} from '../fitness.js';
const d=emptyState();d.life['2026-10-28']={weight:60};const base={id:'mixed',kind:'운동',date:'2026-10-28',time:'12:50',endDate:'2026-10-28',endTime:'13:55',text:'러닝머신 6 7\n힙어브덕션 0 12 3'};
test('유산소7분은 혼합운동 총65분과 중복 계산하지 않는다',()=>{const e=strengthCalories(d,base);assert.equal(e.minutes,65);assert.equal(e.low,237);assert.equal(e.high,382);assert.equal(e.partial,false);assert.match(e.note,/나머지 58분/);assert.deepEqual(exerciseMuscles('힙어브덕션'),['둔근'])});
test('0kg 머신 운동과 맨몸 근력도 계산된다',()=>{const e=strengthCalories(d,{...base,text:'힙어브덕션 0 12 3'});assert.equal(e.low,228);assert.equal(e.high,390)});
test('총시간이 없는 혼합 기록은 유산소 부분만 계산한다',()=>{const e=strengthCalories(d,{...base,memo:true});assert.equal(e.partial,true);assert.equal(e.minutes,7);assert.equal(e.low,34);assert.equal(e.high,34)});
test('세부 유산소 시간이 전체보다 크면 잘못된 합계를 만들지 않는다',()=>{const e=strengthCalories(d,{...base,text:'러닝머신 6 70\n힙어브덕션 0 12 3'});assert.equal(e.low,undefined);assert.equal(e.missing,'time')});
test('유산소 단독은 입력된 분을 사용하고 체중이 없으면 요청한다',()=>{const e=strengthCalories(d,{...base,memo:true,text:'러닝머신 5 20'});assert.equal(e.minutes,20);assert.equal(e.low,76);assert.equal(strengthCalories(emptyState(),base).missing,'weight')});
test('천계와 경사걷기도 범위 기준으로 계산한다',()=>{assert.equal(strengthCalories(d,{...base,text:'천계 5 20'}).low,186);const e=strengthCalories(d,{...base,text:'마이마운틴 8 3 20'});assert.equal(e.low,100);assert.equal(e.high,176)});
test('알 수 없는 운동에 남은 시간을 임의 배분하지 않는다',()=>{const e=strengthCalories(d,{...base,text:'러닝머신 6 7\n새운동 15 15 3'});assert.equal(e.partial,true);assert.equal(e.minutes,7)});
