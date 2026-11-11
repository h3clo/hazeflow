#!/usr/bin/env node
/**
 * N2 contract: one local Live Activity slot, no push, no Watch.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fail = [];
const read = (path) => existsSync(join(root, path)) ? readFileSync(join(root, path), 'utf8') : '';

const appPlist = read('ios/App/App/Info.plist');
const widget = read('ios/App/HazeLiveActivity/HazeLiveActivityWidget.swift');
const plugin = read('ios/App/App/HazeLiveActivityPlugin.swift');
const payload = read('live-activity.js');
const bridge = read('ios/App/App/SceneDelegate.swift');
const app = read('app.js');

if (!appPlist.includes('NSSupportsLiveActivities')) fail.push('app Info.plist missing NSSupportsLiveActivities');
if (appPlist.includes('NSSupportsLiveActivitiesFrequentUpdates')) fail.push('frequent updates are out of scope');
if (!widget.includes('timerInterval')) fail.push('widget must use the system timer');
if (!widget.includes('dynamicIsland')) fail.push('ActivityKit requires a dynamicIsland closure');
if (!plugin.includes('pushType: nil')) fail.push('remote push must stay off');
if (plugin.includes('pushType: .token') || plugin.includes('WCSession')) fail.push('push or Watch API appeared');
if (!payload.includes('resolvePrimaryActivity')) fail.push('payload must reuse the primary activity rule');
if (!plugin.includes('"count"')) fail.push('plugin must report how many Live Activities remain');
if (!app.includes('result.count')) fail.push('status text must include the activity count');
if (!bridge.includes('isScrollEnabled = false')) fail.push('web view must not steal the inner page scroll');
if (!bridge.includes('HAZE_N2_FIXTURE')) fail.push('simulator fixture environment is missing');
if (existsSync(join(root, 'ios/App/Watch')) || existsSync(join(root, 'ios/Watch'))) fail.push('Watch target appeared');

if (fail.length) {
  for (const item of fail) console.error(`FAIL: ${item}`);
  process.exit(1);
}
console.log('PASS: N2 live activity contract OK');
