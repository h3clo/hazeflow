#!/usr/bin/env node
/**
 * N3 contract: reuse the existing reminder plan, no activity-start alerts, no push, no Watch.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fail = [];
const read = (path) => existsSync(join(root, path)) ? readFileSync(join(root, path), 'utf8') : '';

const plan = read('local-reminders.js');
const native = read('native-local-reminders.js');
const ui = read('reminders-ui.js');
const app = read('app.js');
const plugin = read('ios/App/App/HazeLocalReminderPlugin.swift');
const plist = read('ios/App/App/Info.plist');
const entitlements = read('ios/App/App/App.entitlements');

if (!plugin.includes('UNUserNotificationCenter') || !plugin.includes('repeats: false')) fail.push('local reminders must be one-shot UserNotifications');
if (!plugin.includes('return []')) fail.push('foreground notification must not add a second banner');
if (!native.includes('reminderPlan') || !native.includes('HazeLocalReminder')) fail.push('native schedule must reuse reminderPlan');
if (!plan.includes('settings.enabled') || !plan.includes('settings.system')) fail.push('schedule must stay off unless the existing settings are on');
if (plan.includes('activityTiming') || native.includes('syncLiveActivity')) fail.push('activity start must not schedule a notification');
if (!ui.includes('nativeLocal.request')) fail.push('permission must be requested from the existing notification action');
if (!app.includes('publishLocalReminders')) fail.push('schedule must resync after saves and resume');
if (plist.includes('remote-notification') || entitlements.includes('aps-environment') || plugin.includes('pushType')) fail.push('remote push must stay off');
if (existsSync(join(root, 'ios/App/Watch')) || existsSync(join(root, 'ios/Watch'))) fail.push('Watch target appeared');

if (fail.length) {
  for (const item of fail) console.error(`FAIL: ${item}`);
  process.exit(1);
}
console.log('PASS: N3 local notification contract OK');
