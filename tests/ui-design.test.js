import test from 'node:test';
import assert from 'node:assert/strict';
import {readUiDesign,dayGoalProgress,dayProgressPanelHtml} from '../ui-design.js';

test('ui-design 기본값은 classic이고 life만 허용한다',()=>{
 assert.equal(readUiDesign(null),'classic');
 assert.equal(readUiDesign(''),'classic');
 assert.equal(readUiDesign('classic'),'classic');
 assert.equal(readUiDesign('life'),'life');
 assert.equal(readUiDesign('magazine'),'classic');
});

test('오늘 진행률은 일정·루틴 목표만 합산한다',()=>{
 assert.deepEqual(dayGoalProgress({eventDone:1,eventTotal:2,routineDone:2,routineTotal:4}),{goalDone:3,goalTotal:6,pct:50});
 assert.deepEqual(dayGoalProgress({eventDone:0,eventTotal:0,routineDone:0,routineTotal:0}),{goalDone:0,goalTotal:0,pct:0});
 assert.equal(dayGoalProgress({eventDone:3,eventTotal:2,routineDone:5,routineTotal:4}).pct,100);
});

test('진행 패널은 일정·루틴 바만 그리고 기록·할 일은 건수로 표시한다',()=>{
 const html=dayProgressPanelHtml({eventDone:1,eventTotal:2,routineDone:0,routineTotal:0,recordCount:4,taskDue:3});
 assert.match(html,/life-progress-panel/);
 assert.match(html,/1 \/ 2/);
 assert.match(html,/life-progress-fill life-tone-mint/);
 assert.match(html,/오늘 루틴 단계 없음/);
 assert.match(html,/4건/);
 assert.match(html,/남은 3/);
 assert.doesNotMatch(html,/life-tone-sky/);
 assert.doesNotMatch(html,/운동 목표|식사 목표|공부 목표/);
});
