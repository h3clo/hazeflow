import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('N1 verify-native-n1 스크립트가 셸 스모크 계약을 통과한다', () => {
  const r = spawnSync(process.execPath, ['scripts/verify-native-n1.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /PASS: N1 smoke contract OK/);
});
