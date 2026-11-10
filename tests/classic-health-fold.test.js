import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const app=readFileSync(join(root,'app.js'),'utf8');
const style=readFileSync(join(root,'style.css'),'utf8');
const life=readFileSync(join(root,'style-life.css'),'utf8');
const dayView=app.slice(app.indexOf('function dayView()'),app.indexOf('function classicHealthFold()'));
const fold=app.slice(app.indexOf('function classicHealthFold()'),app.indexOf('function weekView('));
const lifeDay=app.slice(app.indexOf('function dayViewLife('),app.indexOf('function dayView()'));

test('Classic 오늘 화면은 건강 요약을 기본 접힘으로 두고 Life는 기존 접힘을 유지한다',()=>{
 assert.match(dayView,/classicHealthFold\(\)/);
 assert.doesNotMatch(dayView,/healthDayStrip\(data,date,\{btn\}\)/);
 assert.match(fold,/function classicHealthFold\(\)/);
 assert.match(fold,/if\(!strip\)return ''/);
 assert.match(fold,/<details class="classic-health-fold"><summary>건강 요약<\/summary>/);
 assert.doesNotMatch(fold,/<details class="classic-health-fold"[^>]*\sopen[\s>]/);
 assert.match(lifeDay,/<details class="life-fold life-health-fold"><summary>건강 요약<\/summary>/);
});

test('Classic 건강 접힘 터치 영역은 44px이고 Life CSS와 섞지 않는다',()=>{
 assert.match(style,/\.classic-health-fold>summary\{[^}]*min-height:44px/);
 assert.match(style,/\.classic-health-fold \.health-day-strip\{[^}]*border-top:1px solid var\(--line\)/);
 assert.doesNotMatch(life,/classic-health-fold/);
});
