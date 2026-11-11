import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateBackup,mergeBackup} from '../domain.js';
import {
  LIFE_ROUTINE_WEEK_GOALS,
  lifeRoutineGoalTask,
  missingLifeRoutineWeekTasks,
  buildLifeRoutineWeekBackup,
  lifeRoutineWeekBackupAll,
  hasSameLifeRoutineGoal,
} from '../life-routine-week.js';

test('생활 루틴 주간 목표는 날짜당 1개·기한만·알림시각 없음',()=>{
  assert.equal(LIFE_ROUTINE_WEEK_GOALS.length,7);
  const dates=LIFE_ROUTINE_WEEK_GOALS.map(g=>g.dueDate);
  assert.deepEqual(dates,[...new Set(dates)]);
  assert.equal(dates[0],'2026-11-13');
  assert.equal(dates.at(-1),'2026-11-19');
  for(const goal of LIFE_ROUTINE_WEEK_GOALS){
    const t=lifeRoutineGoalTask(goal);
    assert.equal(t.listName,'할 일');
    assert.equal(t.dueTime,'');
    assert.equal(t.done,false);
    assert.equal(t.flagged,false);
    assert.equal(t.dueDate,goal.dueDate);
    assert.equal(t.date,goal.dueDate);
  }
  assert.equal(validateBackup(lifeRoutineWeekBackupAll()).tasks.length,7);
});

test('같은 id 또는 같은 제목·날짜가 있으면 추가하지 않는다',()=>{
  const first=LIFE_ROUTINE_WEEK_GOALS[0];
  const byId=[lifeRoutineGoalTask(first)];
  assert.equal(missingLifeRoutineWeekTasks(byId).length,6);
  assert.ok(hasSameLifeRoutineGoal(byId,first));
  const byTitle=[{id:'manual-other',title:first.title,dueDate:first.dueDate,listName:'할 일',dueTime:'',done:false,note:'',completedOn:null,date:first.dueDate}];
  assert.equal(missingLifeRoutineWeekTasks(byTitle).length,6);
  assert.equal(buildLifeRoutineWeekBackup(byTitle).tasks.length,6);
});

test('mergeBackup는 기존 기록을 덮어쓰지 않고 안정 id면 재가져오기도 중복하지 않는다',()=>{
  const current=emptyState();
  current.tasks=[{id:'keep-me',title:'기존 할 일',listName:'할 일',dueDate:'2026-11-12',dueTime:'',done:false,note:'보존',completedOn:null,date:'2026-11-12',flagged:false}];
  const incoming=lifeRoutineWeekBackupAll();
  const once=mergeBackup(current,incoming);
  assert.equal(once.tasks.length,8);
  assert.equal(once.tasks.find(t=>t.id==='keep-me').note,'보존');
  const twice=mergeBackup(once,incoming);
  assert.equal(twice.tasks.length,8);
  assert.equal(twice.tasks.filter(t=>t.title==='독서 20분').length,1);
});
