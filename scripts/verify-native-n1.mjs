#!/usr/bin/env node
/**
 * N1 contract check. Does not boot a simulator unless HAZEFLOW_N1_RUN_SIM=1.
 * Live Activities and Watch targets stay out of this step.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const swiftPath = join(root, 'ios/App/N1SmokeUITests/N1SmokeUITests.swift');
const fail = [];

if (!existsSync(swiftPath)) fail.push('missing ios/App/N1SmokeUITests/N1SmokeUITests.swift');
else {
  const swift = readFileSync(swiftPath, 'utf8');
  for (const needle of ['나의 하루', 'N1simcheck', '로그인', 'testTopButtonsStayTappableAndTabsStayDuringScroll', 'Pinch zoom stays a device check']) {
    if (!swift.includes(needle)) fail.push(`N1 UI test missing ${needle}`);
  }
  for (const banned of ['ActivityKit', 'WidgetKit', 'WCSession', 'Live Activity']) {
    if (swift.includes(banned)) fail.push(`N1 UI test must not start ${banned}`);
  }
}

const plist = existsSync(join(root, 'ios/App/App/Info.plist'))
  ? readFileSync(join(root, 'ios/App/App/Info.plist'), 'utf8')
  : '';
if (plist.includes('NSSupportsLiveActivities')) fail.push('Info.plist must not enable Live Activities in N1');
if (existsSync(join(root, 'ios/App/Watch')) || existsSync(join(root, 'ios/Watch'))) {
  fail.push('Watch target appeared during N1');
}

if (fail.length) {
  for (const item of fail) console.error(`FAIL: ${item}`);
  process.exit(1);
}
console.log('PASS: N1 smoke contract OK (simulator run is xcodebuild test on a Mac)');
