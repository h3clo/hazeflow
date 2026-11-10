import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const app=readFileSync(join(root,'app.js'),'utf8');
const style=readFileSync(join(root,'style.css'),'utf8');
const life=readFileSync(join(root,'style-life.css'),'utf8');

test('Classic·Life 캡처 추가 설정은 details로 접혀 있고 open 기본값이 없다',()=>{
 assert.match(app,/<details class="capture-extra-settings"><summary>추가 설정<\/summary>/);
 assert.match(app,/<details class="life-fold capture-extra-settings"><summary>/);
 assert.doesNotMatch(app,/<details class="capture-extra-settings"[^>]*\sopen[\s>]/);
 assert.doesNotMatch(app,/<details class="life-fold capture-extra-settings"[^>]*\sopen[\s>]/);
});

test('좁은 폭에서 추가 설정 summary는 44px 터치 영역을 확보한다',()=>{
 assert.match(style,/\.capture-extra-settings>summary\{[^}]*min-height:44px/);
 assert.ok(style.includes('@media(max-width:740px){.capture-action-bar'));
 assert.ok(style.includes('.capture-extra-settings>summary{min-height:44px'));
 assert.match(life,/\.life-fold > summary\{[\s\S]*?min-height:44px/);
});

test('좁은 폭 카테고리 그리드는 7개 분류에 맞게 4열이며 6열 규칙을 쓰지 않는다',()=>{
 assert.match(style,/\.capture-categories\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}/);
 assert.doesNotMatch(style,/\.capture-categories\{grid-template-columns:repeat\(6,/);
 assert.ok(style.includes('.capture-extra-settings .capture-categories{grid-template-columns:repeat(4,minmax(0,1fr))'));
 assert.match(life,/\.life-fold\.capture-extra-settings \.capture-categories\{[\s\S]*?repeat\(4,minmax\(0,1fr\)\)/);
});
