import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const style=readFileSync(new URL('../style-life.css',import.meta.url),'utf8');

test('Life 모바일 미디어쿼리는 html[data-ui-design=life] .life-grid 특이도를 이긴다',()=>{
 assert.match(style,/html\[data-ui-design=life\] \.life-grid,\s*\.life-grid\{[^}]*grid-template-columns:1\.18fr 1fr \.9fr/);
 assert.match(style,/@media \(max-width:1100px\)\{[\s\S]*?html\[data-ui-design=life\] \.life-grid,\s*\.life-grid\{grid-template-columns:1fr 1fr\}/);
 assert.match(style,/@media \(max-width:820px\)\{[\s\S]*?html\[data-ui-design=life\] \.life-grid,\s*html\[data-ui-design=life\] \.life-col-habit,\s*\.life-grid,\.life-col-habit\{grid-template-columns:1fr\}/);
 assert.match(style,/@media \(max-width:560px\)\{[\s\S]*?html\[data-ui-design=life\] \.life-capture-tiles,\s*\.life-capture-tiles\{grid-template-columns:1fr\}/);
});
