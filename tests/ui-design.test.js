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

test('진행 패널은 시안형 가로 구조에 실제 일정·루틴·기록·할 일만 넣는다',()=>{
 const html=dayProgressPanelHtml({eventDone:1,eventTotal:2,routineDone:0,routineTotal:0,recordCount:4,taskDue:3});
 assert.match(html,/life-progress-panel/);
 assert.match(html,/1 \/ 2/);
 assert.match(html,/오늘의 진행/);
 assert.match(html,/life-metric-bar-fill life-tone-mint/);
 assert.match(html,/life-metric-bar-empty|오늘 루틴|0 \/ 0/);
 assert.match(html,/4건/);
 assert.match(html,/남은 3/);
 assert.doesNotMatch(html,/운동 목표|식사 목표|공부 목표|1 \/ 3|0 \/ 1/);
 assert.doesNotMatch(html,/>\s*\d+%\s*</);
});
