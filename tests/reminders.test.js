import test from 'node:test';
import assert from 'node:assert/strict';
import {reminderListState} from '../reminders.js';
const tasks=[{id:'a',title:'업무',listName:'업무',dueDate:'2026-11-01'},{id:'b',title:'장보기',listName:'생활',dueDate:null,flagged:true},{id:'c',title:'완료',listName:'업무',done:true},{id:'d',title:'여행',listName:'버킷리스트'}];
test('목록별 숫자와 표시 항목이 일치하고 목표는 분리한다',()=>{const s=reminderListState(tasks,{list:'업무',scope:'today',today:'2026-11-01'});assert.deepEqual(s.items.map(t=>t.id),['a']);assert.equal(s.counts.all,1);assert.equal(s.counts.today,1);assert.equal(s.counts.completed,1);assert.deepEqual(s.lists,['업무','생활']);assert.equal(reminderListState(tasks,{today:'2026-11-01'}).counts.all,2)});
test('마지막 항목 삭제·목록 변경 후 존재하지 않는 필터를 해제한다',()=>{const s=reminderListState(tasks.filter(t=>t.listName!=='업무'),{list:'업무',today:'2026-11-01'});assert.equal(s.list,'전체');assert.deepEqual(s.items.map(t=>t.id),['b']);assert.equal(s.counts.noDate,1)});
