/**
 * One-week life-routine experiment tasks (2026-11-13 … 2026-11-19).
 * One-shot todos only — no routines, no dueTime, no notification toggles.
 * Merge via existing backup import; never overwrite existing records.
 */
import {emptyState,validateBackup} from './domain.js';

/** Stable ids so a second JSON merge does not duplicate. */
export const LIFE_ROUTINE_WEEK_GOALS = Object.freeze([
  {id:'life-routine-2026-11-13-reading',dueDate:'2026-11-13',title:'독서 20분',note:'읽고 싶은 책 자유롭게 읽기'},
  {id:'life-routine-2026-11-14-thoughts',dueDate:'2026-11-14',title:'생각 기록 5분',note:'요즘 자주 생각하는 것 적기'},
  {id:'life-routine-2026-11-15-walk',dueDate:'2026-11-15',title:'산책 20분',note:'휴대폰 없이 주변 풍경 관찰하기'},
  {id:'life-routine-2026-11-16-code',dueDate:'2026-11-16',title:'개발 공부 30분',note:'Cursor 없이 직접 코드 작성하기'},
  {id:'life-routine-2026-11-17-feelings',dueDate:'2026-11-17',title:'감정 돌아보기 5분',note:'오늘 느낀 감정과 이유 적기'},
  {id:'life-routine-2026-11-18-taste',dueDate:'2026-11-18',title:'취향 탐구 30분',note:'좋아하는 음악·영화·게임 깊이 즐기기'},
  {id:'life-routine-2026-11-19-week-review',dueDate:'2026-11-19',title:'일주일 돌아보기 10분',note:'좋았던 활동과 유지할 습관 고르기'},
]);

export function lifeRoutineGoalTask(goal){
  return {
    id:goal.id,
    title:goal.title,
    note:goal.note,
    listName:'할 일',
    dueDate:goal.dueDate,
    dueTime:'',
    date:goal.dueDate,
    flagged:false,
    done:false,
    createdOn:goal.dueDate,
    completedOn:null,
  };
}

/** Same goal = same stable id, or same title + dueDate (manual prior entry). */
export function hasSameLifeRoutineGoal(tasks,goal){
  const list=Array.isArray(tasks)?tasks:[];
  return list.some(t=>t&&(t.id===goal.id||(t.title===goal.title&&t.dueDate===goal.dueDate)));
}

/** Tasks not already present in existingTasks (by id or title+dueDate). */
export function missingLifeRoutineWeekTasks(existingTasks){
  return LIFE_ROUTINE_WEEK_GOALS
    .filter(goal=>!hasSameLifeRoutineGoal(existingTasks,goal))
    .map(lifeRoutineGoalTask);
}

/**
 * Backup payload with only the missing week tasks (empty other collections).
 * Safe to mergeImport: mergeBackup keeps current rows for matching ids.
 */
export function buildLifeRoutineWeekBackup(existingTasks=[]){
  const state=emptyState();
  state.tasks=missingLifeRoutineWeekTasks(existingTasks);
  return validateBackup(state);
}

/** Full week backup (all 7). Prefer when current device state is unknown. */
export function lifeRoutineWeekBackupAll(){
  return buildLifeRoutineWeekBackup([]);
}
