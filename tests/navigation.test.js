import test from 'node:test';
import assert from 'node:assert/strict';
import {menuGroups,groupForView,groupDestination} from '../navigation.js';
test('기존 화면은 하나의 상위 메뉴에서 모두 접근한다',()=>{const views=menuGroups.flatMap(g=>g.views.map(([id])=>id));assert.equal(new Set(views).size,13);assert.equal(views.length,13);for(const view of ['day','week','tasks','routines','goals','history','diary','life','favorites','money','assets','review','compare'])assert.ok(views.includes(view));assert.equal(groupForView('tasks').id,'plan');assert.equal(groupForView('life').id,'records')});
test('상위 메뉴 복귀는 해당 그룹의 마지막 화면을 열고 다른 그룹 값은 무시한다',()=>{assert.equal(groupDestination('plan',{plan:'tasks'}),'tasks');assert.equal(groupDestination('plan',{plan:'money'}),'week');assert.equal(groupDestination('finance'),'money');assert.equal(groupDestination('invalid'),'day')});
