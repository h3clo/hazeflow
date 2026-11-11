import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../domain.js';
import {reminderDefaults, reminderPlan} from '../foreground-reminders.js';
import {createLocalReminderSync, localReminderPayloads, notificationId, reconcileReminders} from '../local-reminders.js';

const now = +new Date('2026-11-12T09:00:00');

function eventState() {
  const state = emptyState();
  state.events = [{id: 'meet', date: '2026-11-12', start: '11:00', title: '병원', status: 'pending'}];
  state.logs = [{id: 'walk', date: '2026-11-12', time: '09:10', kind: '일상', text: '산책 시작', activityTiming: 'independent'}];
  return state;
}

test('알림을 끄면 예약을 비우고 활동 시작은 알림이 되지 않는다', () => {
  const plan = reminderPlan(eventState(), new Date(now), {...reminderDefaults, enabled: true, system: true});
  assert.equal(plan.some(row => row.title.includes('산책')), false);
  const payloads = localReminderPayloads(plan, now);
  assert.equal(payloads.length, 1);
  assert.equal(payloads[0].title, '일정 알림');
  assert.equal(payloads[0].extra.kind, 'reminder');
  assert.equal(payloads[0].extra.view, 'day');
  assert.equal(localReminderPayloads(plan, +new Date('2026-11-12T12:00:00')).length, 0);
});

test('같은 키는 같은 번호이고 겹치면 다른 번호를 쓴다', () => {
  const used = new Set();
  const first = notificationId('same', used);
  assert.equal(notificationId('same', new Set()), first);
  const second = notificationId('same', used);
  assert.notEqual(first, second);
  assert.ok(first > 0 && first < 2147483647);
});

test('없어진 예약만 취소하고 다른 알림은 건드리지 않는다', () => {
  const next = [{id: 2, extra: {kind: 'reminder'}}];
  const diff = reconcileReminders([
    {id: 1, extra: {kind: 'reminder'}},
    {id: 2, extra: {kind: 'reminder'}},
    {id: 9, extra: {kind: 'other'}}
  ], next);
  assert.deepEqual(diff.cancel, [1]);
  assert.equal(diff.schedule.length, 1);
});

test('권한 전이나 꺼진 설정은 새로 예약하지 않는다', async () => {
  const scheduled = [];
  const cancelled = [];
  const bridge = {
    async pending() {return [{id: 4, extra: {kind: 'reminder'}}]},
    async check() {return 'granted'},
    async cancel(ids) {cancelled.push(...ids)},
    async schedule(rows) {scheduled.push(...rows)}
  };
  const off = createLocalReminderSync({
    isNative: () => true,
    bridge,
    getSettings: () => ({enabled: false, system: true}),
    getPlan: () => reminderPlan(eventState(), new Date(now), {...reminderDefaults, enabled: true, system: true}),
    now: () => now
  });
  const cleared = await off.sync();
  assert.equal(cleared.status, 'cleared');
  assert.deepEqual(cancelled, [4]);
  assert.equal(scheduled.length, 0);

  const denied = createLocalReminderSync({
    isNative: () => true,
    bridge: {...bridge, pending: async () => [], check: async () => 'denied', cancel: async () => {throw Error('cancel')}},
    getSettings: () => ({enabled: true, system: true}),
    getPlan: () => [],
    now: () => now
  });
  assert.equal((await denied.sync()).status, 'denied');
});

test('브리지 오류는 기록 저장과 분리된 unsupported다', async () => {
  const sync = createLocalReminderSync({
    isNative: () => true,
    bridge: {async pending() {throw Error('plugin')}},
    getSettings: () => ({enabled: true, system: true}),
    getPlan: () => [],
    now: () => now
  });
  assert.deepEqual(await sync.sync(), {status: 'unsupported', count: 0});
});

test('허용된 일정만 예약하고 같은 번호는 다시 만들지 않는다', async () => {
  const scheduled = [];
  const sync = createLocalReminderSync({
    isNative: () => true,
    bridge: {
      async pending() {return []},
      async check() {return 'granted'},
      async cancel() {},
      async schedule(rows) {scheduled.push(...rows)}
    },
    getSettings: () => ({enabled: true, system: true}),
    getPlan: () => reminderPlan(eventState(), new Date(now), {...reminderDefaults, enabled: true, system: true}),
    now: () => now
  });
  const result = await sync.sync();
  assert.equal(result.status, 'scheduled');
  assert.equal(result.count, 1);
  assert.equal(scheduled[0].extra.view, 'day');
  assert.equal(scheduled[0].body, '병원');
  assert.equal(localReminderPayloads(reminderPlan(eventState(), new Date(now), {...reminderDefaults, enabled: true, system: true}), now, {limit: 1}).length, 1);
});

test('웹에서는 플러그인을 호출하지 않는다', async () => {
  let calls = 0;
  const sync = createLocalReminderSync({
    isNative: () => false,
    bridge: {async pending() {calls += 1; return []}},
    getSettings: () => ({enabled: true, system: true}),
    getPlan: () => [],
    now: () => now
  });
  assert.equal((await sync.sync()).status, 'skipped');
  assert.equal(calls, 0);
});
