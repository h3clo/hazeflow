import test from 'node:test';
import assert from 'node:assert/strict';
import {whiteboardTasks} from '../whiteboard.js';
const tasks=[{id:'today',title:'오늘 할 일',dueDate:'2026-10-31',done:false},{id:'old',title:'지난 기한',dueDate:'2026-10-30',done:false},{id:'any',title:'언젠가',dueDate:null,done:false},{id:'future',title:'내일 할 일',dueDate:'2026-11-01',done:false},{id:'done',title:'완료',dueDate:null,done:true}];
test('기본 보드는 오늘·지난 기한·기한 없는 미완료만 보여준다',()=>assert.deepEqual(whiteboardTasks(tasks,'2026-10-31').map(t=>t.id),['old','today','any']));
test('전체 모드는 미래 할 일도 포함하되 완료한 것은 제외한다',()=>assert.equal(whiteboardTasks(tasks,'2026-10-31','all').length,4));
test('날짜가 바뀌면 새 오늘 할 일이 자연스럽게 나타나며 원본은 바꾸지 않는다',()=>{const before=structuredClone(tasks);assert.equal(whiteboardTasks(tasks,'2026-11-01').length,4);assert.deepEqual(tasks,before)});
