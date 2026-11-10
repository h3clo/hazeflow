import test from 'node:test';
import assert from 'node:assert/strict';
import {captureModeForShortcut,captureSubmitLabel} from '../capture-shortcuts.js';

test('Life 빠른 기록은 짧은 기록 모드, Classic은 활동 시작',()=>{
 assert.equal(captureModeForShortcut({uiDesign:'life'}), 'memo');
 assert.equal(captureModeForShortcut({uiDesign:'classic'}), 'activity');
 assert.equal(captureModeForShortcut({uiDesign:'life',futureDay:true}), null);
});

test('저장 버튼 문구는 모드를 구분한다',()=>{
 assert.equal(captureSubmitLabel('memo'),'짧은 기록 저장');
 assert.equal(captureSubmitLabel('activity'),'활동 시작');
});
