import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const app=readFileSync(join(root,'app.js'),'utf8');
const life=readFileSync(join(root,'style-life.css'),'utf8');
const html=readFileSync(join(root,'index.html'),'utf8');
const header=app.slice(app.indexOf('function lifeDayHeader()'),app.indexOf('function lifeFeatureCard('));

test('Life 날짜 알약은 오늘이 아니면 그 날짜를 보여주고 오늘 버튼을 붙인다',()=>{
 assert.match(header,/const onToday=date===todayKey\(\)/);
 assert.match(header,/const pillLabel=onToday\?'오늘':new Date\(date\+'T12:00:00'\)\.toLocaleDateString\('ko-KR',\{month:'long',day:'numeric'\}\)/);
 assert.match(header,/life-date-pill-label">\$\{esc\(pillLabel\)\}/);
 assert.doesNotMatch(header,/life-date-pill-label">오늘</);
 assert.match(header,/\$\{onToday\?'':btn\('오늘','today','','life-today-jump','aria-label="오늘로 이동"'\)\}/);
 assert.match(header,/btn\('‹','prev','','life-nav','aria-label="이전 날짜"'\)/);
 assert.match(header,/btn\('›','next','','life-nav','aria-label="다음 날짜"'\)/);
});

test('Life 날짜 이동은 좁은 폭에서 44px이고 Classic 오늘 버튼은 그대로다',()=>{
 assert.match(life,/@media \(max-width:820px\)\{[\s\S]*?html\[data-ui-design=life\] body\[data-view=day\] > aside\{inset:auto 0 0;width:100%;height:auto/);
 assert.match(life,/@media \(max-width:820px\)\{[\s\S]*?\.life-day-header\{align-items:flex-start;flex-direction:column\}/);
 assert.match(life,/@media \(max-width:820px\)\{[\s\S]*?\.life-date-pill \.life-nav,\.life-day-tools \.life-today-jump\{min-width:44px;width:auto;height:44px;min-height:44px\}/);
 assert.match(html,/data-act="today">오늘</);
 assert.match(life,/html\[data-ui-design=life\] body\[data-view=day\] \.datebar,/);
 assert.match(life,/display:none !important/);
});
