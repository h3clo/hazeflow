import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('아이폰 셸은 하단 탭을 스크롤 밖에 두고 핀치 확대와 상태바 확장을 연다', () => {
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  const life = readFileSync(new URL('../style-life.css', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const config = JSON.parse(readFileSync(new URL('../capacitor.config.json', import.meta.url), 'utf8'));
  assert.match(life, /html\.native-app body\.native-app>aside\{position:relative/);
  assert.match(life, /padding-top:calc\(16px \+ env\(safe-area-inset-top,0px\)\)/);
  assert.doesNotMatch(life, /height:100dvh/);
  assert.match(css, /html\.native-app input,html\.native-app textarea,html\.native-app select\{font-size:16px!important\}/);
  assert.match(html, /viewport-fit=cover,interactive-widget=resizes-visual/);
  assert.match(readFileSync(new URL('../native-app.js', import.meta.url), 'utf8'), /interactive-widget=resizes-visual/);
  assert.equal(config.ios.contentInset, 'never');
  assert.equal(config.ios.zoomEnabled, true);
  assert.equal(config.server, undefined);
});
