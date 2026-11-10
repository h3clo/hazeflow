import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const app=readFileSync(join(root,'app.js'),'utf8');
const style=readFileSync(join(root,'style.css'),'utf8');
const life=readFileSync(join(root,'style-life.css'),'utf8');
const fold=app.slice(app.indexOf('function classicDiaryFold()'),app.indexOf('function dayWorkspace('));
const workspace=app.slice(app.indexOf('function dayWorkspace('),app.indexOf('function dayOverviewClassic('));
const lifeDay=app.slice(app.indexOf('function dayViewLife('),app.indexOf('function dayView()'));

test('Classic 오늘 흐름의 일기 미리보기는 기본 접힘이다',()=>{
 assert.match(fold,/function classicDiaryFold\(\)/);
 assert.match(fold,/<details class="classic-diary-fold"><summary>/);
 assert.doesNotMatch(fold,/<details class="classic-diary-fold"[^>]*\sopen[\s>]/);
 assert.match(fold,/하루 돌아보기 →/);
 assert.match(workspace,/classicDiaryFold\(\)/);
 assert.doesNotMatch(workspace,/<div class="day-memo">\$\{icon\('diary'\)\}/);
 assert.doesNotMatch(lifeDay,/classic-diary-fold/);
});

test('Classic 일기 접힘 터치 영역은 44px이고 Life CSS와 섞지 않는다',()=>{
 assert.match(style,/\.classic-diary-fold>summary\{[^}]*min-height:44px/);
 assert.doesNotMatch(life,/classic-diary-fold/);
});
