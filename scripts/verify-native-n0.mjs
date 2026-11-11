#!/usr/bin/env node
/**
 * N0 structural checks for Capacitor shells — runs on Linux/macOS without Xcode.
 * Does not compile iOS/Android. Exit 0 = contract intact; non-zero = broken paths/config.
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fail = [];
const warn = [];
const ok = [];

function read(rel) {
  const p = join(root, rel);
  if (!existsSync(p)) {
    fail.push(`missing file: ${rel}`);
    return null;
  }
  return readFileSync(p, 'utf8');
}

function mustInclude(rel, needles, label = rel) {
  const text = read(rel);
  if (text == null) return;
  for (const n of needles) {
    if (!text.includes(n)) fail.push(`${label}: expected to contain ${JSON.stringify(n)}`);
    else ok.push(`${label} has ${JSON.stringify(n)}`);
  }
}

function cmdAvailable(bin) {
  const r = spawnSync(bin, ['--version'], { encoding: 'utf8' });
  return r.status === 0 || (r.error == null && (r.stdout || r.stderr));
}

// --- Capacitor / package contract ---
mustInclude('capacitor.config.json', ['"appId": "io.h3clo.hazeflow"', '"webDir": "dist"', '"contentInset": "never"', '"zoomEnabled": true']);
const cap = read('capacitor.config.json');
if (cap?.includes('"server"') && /"url"\s*:/.test(cap)) {
  fail.push('capacitor.config.json must not pin server.url to Pages');
} else {
  ok.push('capacitor.config.json has no server.url pin');
}

mustInclude('package.json', [
  '"@capacitor/ios"',
  '"@capacitor/android"',
  '"@capacitor/app"',
  '"build:app"',
  '"app:sync"',
]);

mustInclude('native-app.js', [
  'io.h3clo.hazeflow://auth/callback',
  'appStateChange',
  'appUrlOpen',
]);

// --- iOS shell ---
const iosFiles = [
  'ios/App/App.xcodeproj/project.pbxproj',
  'ios/App/App/Info.plist',
  'ios/App/App/AppDelegate.swift',
  'ios/App/App/SceneDelegate.swift',
  'ios/App/CapApp-SPM/Package.swift',
  'ios/debug.xcconfig',
];
for (const f of iosFiles) {
  if (!existsSync(join(root, f))) fail.push(`missing iOS file: ${f}`);
  else ok.push(`iOS present: ${f}`);
}

mustInclude('ios/App/App/Info.plist', [
  'io.h3clo.hazeflow',
  'NSCameraUsageDescription',
  'NSPhotoLibraryUsageDescription',
  'UIInterfaceOrientationPortrait',
]);

mustInclude('ios/App/App.xcodeproj/project.pbxproj', [
  'PRODUCT_BUNDLE_IDENTIFIER = io.h3clo.hazeflow',
  'IPHONEOS_DEPLOYMENT_TARGET = 15.0',
]);

mustInclude('ios/App/CapApp-SPM/Package.swift', [
  '.iOS(.v15)',
  'capacitor-swift-pm',
  'CapacitorApp',
]);

const pbx = read('ios/App/App.xcodeproj/project.pbxproj') || '';
if (/DEVELOPMENT_TEAM\s*=\s*[^;]+;/.test(pbx) && !/DEVELOPMENT_TEAM\s*=\s*""/.test(pbx)) {
  ok.push('DEVELOPMENT_TEAM set in pbxproj (user/Mac)');
} else {
  warn.push('DEVELOPMENT_TEAM unset — Xcode Personal Team must be chosen on user Mac for device install');
}

if (!existsSync(join(root, 'ios/App/App/App.entitlements'))) {
  ok.push('no App.entitlements yet (Push/App Groups/Watch later)');
} else {
  warn.push('App.entitlements present — review before free-team device builds');
}

// --- Android status-only ---
mustInclude('android/app/src/main/AndroidManifest.xml', [
  'io.h3clo.hazeflow',
  'android:host="auth"',
  'android:path="/callback"',
  'android.permission.INTERNET',
]);
mustInclude('android/variables.gradle', ['minSdkVersion = 24', 'targetSdkVersion = 36']);
mustInclude('android/app/build.gradle', ['applicationId "io.h3clo.hazeflow"']);
const manifest = read('android/app/src/main/AndroidManifest.xml') || '';
if (!manifest.includes('resizeableActivity')) {
  ok.push('Android resizeableActivity omitted (API 24+ default true — DeX OK)');
}

// --- Host toolchain (informational) ---
const host = {
  platform: process.platform,
  xcodebuild: cmdAvailable('xcodebuild'),
  pod: cmdAvailable('pod'),
  java: cmdAvailable('java'),
  androidHome: !!(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT),
};
if (host.platform === 'darwin') {
  if (!host.xcodebuild) fail.push('macOS host but xcodebuild missing');
  else ok.push('xcodebuild available');
} else {
  warn.push(`host is ${host.platform} — iOS Simulator/device compile not possible here (expected for Cloud Agent)`);
}
if (!host.androidHome) warn.push('ANDROID_HOME unset — Android APK assemble blocked on this host');
else ok.push('ANDROID_HOME set');

// --- Optional: confirm synced web assets after prior app:sync ---
const iosPublic = join(root, 'ios/App/App/public/index.html');
const andPublic = join(root, 'android/app/src/main/assets/public/index.html');
if (existsSync(iosPublic)) {
  const html = readFileSync(iosPublic, 'utf8');
  if (html.includes('/hazeflow/')) fail.push('ios public assets still use /hazeflow/ base — re-run npm run app:sync');
  else ok.push('ios public assets use absolute / paths (native base)');
} else {
  warn.push('ios/App/App/public missing — run npm run app:sync on a build machine (gitignored)');
}
if (existsSync(andPublic)) ok.push('android public assets present');
else warn.push('android public assets missing — run npm run app:sync');

// Report
console.log('N0 native shell verification');
console.log(JSON.stringify({ host, ok: ok.length, warn: warn.length, fail: fail.length }, null, 2));
for (const w of warn) console.warn(`WARN: ${w}`);
for (const f of fail) console.error(`FAIL: ${f}`);
if (fail.length) process.exit(1);
console.log('PASS: native shell contract OK (compile/device still Mac/SDK-dependent)');
process.exit(0);
