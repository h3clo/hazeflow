#!/usr/bin/env node
/**
 * Watch companion: one primary activity from the phone, no second store, no alerts.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fail = [];
const read = (path) => existsSync(join(root, path)) ? readFileSync(join(root, path), 'utf8') : '';

const snapshot = read('ios/App/HazeWatch/HazeWatchSnapshot.swift');
const view = read('ios/App/HazeWatch/HazeWatchView.swift');
const session = read('ios/App/HazeWatch/HazeWatchSession.swift');
const relay = read('ios/App/App/HazeWatchRelay.swift');
const plugin = read('ios/App/App/HazeLiveActivityPlugin.swift');
const watchTree = [
  'ios/App/HazeWatch/HazeWatchApp.swift',
  'ios/App/HazeWatch/HazeWatchView.swift',
  'ios/App/HazeWatch/HazeWatchSession.swift',
  'ios/App/HazeWatch/HazeWatchSnapshot.swift'
].map(read).join('\n');

if (!snapshot.includes('func hazeWatchPresentation')) fail.push('watch screen rule is missing');
if (!snapshot.includes('.staleActivity') || !view.includes('iPhone과 연결되지 않음')) fail.push('disconnected state must stay labeled');
if (!view.includes('진행 중인 활동 없음')) fail.push('empty state copy is missing');
if (!view.includes('timerInterval')) fail.push('connected elapsed time must use the start instant');
if (!plugin.includes('HazeWatchRelay.shared.publish')) fail.push('watch must reuse the Live Activity payload');
if (!relay.includes('updateApplicationContext')) fail.push('phone must send one latest snapshot');
if (watchTree.includes('UNUserNotificationCenter') || relay.includes('UNUserNotificationCenter')) fail.push('watch must not schedule notifications');
if (watchTree.includes('supabase') || relay.includes('supabase')) fail.push('watch must not open its own account');
if (plugin.includes('WCSession')) fail.push('Live Activity plugin must not own the watch session');

if (fail.length) {
  for (const item of fail) console.error(`FAIL: ${item}`);
  process.exit(1);
}
console.log('PASS: Watch companion contract OK');
