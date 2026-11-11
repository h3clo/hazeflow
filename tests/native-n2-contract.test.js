import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('N2 Live Activity 계약이 푸시와 Watch를 제외한다', () => {
  const r = spawnSync(process.execPath, ['scripts/verify-native-n2.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /PASS: N2 live activity contract OK/);
});
