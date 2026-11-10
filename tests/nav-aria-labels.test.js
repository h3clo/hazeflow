import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const app=readFileSync(join(root,'app.js'),'utf8');
const lifeHeader=app.slice(app.indexOf('function lifeDayHeader()'),app.indexOf('function lifeFeatureCard('));
const monthCal=app.slice(app.indexOf('function monthCalendar()'),app.indexOf('function dayCloseView()'));

test('Life 날짜 이동 ‹› 버튼에 이전/다음 날짜 라벨이 있다',()=>{
 assert.match(lifeHeader,/btn\('‹','prev','','life-nav','aria-label="이전 날짜"'\)/);
 assert.match(lifeHeader,/btn\('›','next','','life-nav','aria-label="다음 날짜"'\)/);
});

test('기록 달력 ‹› 버튼에 이전/다음 달 라벨이 있다',()=>{
 assert.match(monthCal,/btn\('‹','month-prev','','small-button','aria-label="이전 달"'\)/);
 assert.match(monthCal,/btn\('›','month-next','','small-button','aria-label="다음 달"'\)/);
});
