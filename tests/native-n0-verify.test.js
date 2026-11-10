import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('N0 verify-native-n0 스크립트가 셸 계약을 통과한다', () => {
  const r = spawnSync(process.execPath, ['scripts/verify-native-n0.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /PASS: native shell contract OK/);
});
