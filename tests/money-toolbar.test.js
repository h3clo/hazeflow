import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const app=readFileSync(join(root,'app.js'),'utf8');
const style=readFileSync(join(root,'style.css'),'utf8');
const life=readFileSync(join(root,'style-life.css'),'utf8');
const toolbar=app.slice(app.indexOf('function moneyView()'),app.indexOf('async function moneyImportEditor()'));

test('가계부 도구는 진단·월 내보내기를 두고 가져오기·연결만 접는다',()=>{
 assert.match(toolbar,/class="feature-toolbar money-toolbar"/);
 assert.match(toolbar,/class="row-actions money-toolbar-primary"/);
 const primary=toolbar.slice(toolbar.indexOf('money-toolbar-primary'),toolbar.indexOf('money-tool-fold'));
 const fold=toolbar.slice(toolbar.indexOf('money-tool-fold'),toolbar.indexOf('overview review-overview'));
 assert.match(primary,/btn\('기록 진단','money-diagnose'/);
 assert.match(primary,/btn\('월 CSV 내보내기','money-export'/);
 assert.match(toolbar,/<details class="money-tool-fold"><summary>가져오기·연결<\/summary>/);
 assert.doesNotMatch(toolbar,/<details class="money-tool-fold"[^>]*\sopen[\s>]/);
 for(const act of ['bank-csv-preview','shopping-categories','purchase-import','shopping-connect','shopping-import','money-import']){
  assert.match(fold,new RegExp(`btn\\('[^']*','${act}'`));
  assert.doesNotMatch(primary,new RegExp(`'${act}'`));
 }
});

test('가계부 접힘은 Classic 전용이고 빠른 입력과 Life 스타일은 그대로다',()=>{
 assert.match(toolbar,/data-form="money-quick"/);
 assert.match(style,/\.money-tool-fold>summary\{[^}]*min-height:44px/);
 assert.match(style,/@media\(max-width:740px\)\{\.money-toolbar-primary\{margin-left:0;width:100%\}/);
 assert.doesNotMatch(life,/money-tool-fold|money-toolbar/);
});
