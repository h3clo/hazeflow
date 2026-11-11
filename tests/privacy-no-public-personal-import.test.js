import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readdirSync, statSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function listFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) listFiles(p, out);
    else out.push(p);
  }
  return out;
}

test('개인 할 일 시드·생성기가 public/Git 트리에 다시 들어오지 않는다', () => {
  assert.equal(existsSync(join(root, 'life-routine-week.js')), false);
  assert.equal(existsSync(join(root, 'docs/life-routine-week-2026-11.md')), false);
  assert.equal(existsSync(join(root, 'public/imports')), false);
  const banned = listFiles(join(root, 'public')).filter((p) =>
    /life-routine-week|haze-flow-personal/i.test(p) || /\/imports\//.test(p.replaceAll('\\', '/')),
  );
  assert.deepEqual(banned, []);
});
