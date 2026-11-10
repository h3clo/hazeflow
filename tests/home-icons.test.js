import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(join(root,'index.html'),'utf8');
const manifest=JSON.parse(readFileSync(join(root,'public/manifest.webmanifest'),'utf8'));

test('홈 아이콘·manifest·apple-touch 참조가 캐시 무효화 파일명을 가리킨다',()=>{
 assert.match(html,/favicon-haze-cloud-20261110\.png/);
 assert.match(html,/apple-touch-icon-haze-cloud-20261110\.png/);
 assert.match(html,/manifest\.webmanifest/);
 assert.doesNotMatch(html,/favicon\.svg/);
 assert.ok(!existsSync(join(root,'public/favicon.svg')));
 assert.equal(manifest.icons.length,2);
 for(const icon of manifest.icons){
  assert.ok(existsSync(join(root,'public',icon.src)),icon.src);
  assert.match(icon.src,/haze-cloud-20261110\.png$/);
 }
 assert.ok(existsSync(join(root,'public/apple-touch-icon-haze-cloud-20261110.png')));
 assert.ok(existsSync(join(root,'public/favicon-haze-cloud-20261110.png')));
});
