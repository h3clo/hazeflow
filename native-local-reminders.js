import {registerPlugin} from '@capacitor/core';
import {Capacitor} from '@capacitor/core';
import {reminderPlan} from './foreground-reminders.js';
import {createLocalReminderSync} from './local-reminders.js';

const HazeLocalReminder = registerPlugin('HazeLocalReminder');

function iosNative() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

function bridgeCall(promise, step) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(Error('bridge:' + step)), 2500))
  ]);
}

export function createNativeLocalReminders({getSettings, getData, navigate, now = () => Date.now()}) {
  if (iosNative()) {
    HazeLocalReminder.addListener('action', action => {
      const extra = action?.extra || {};
      if (extra.kind !== 'reminder') return;
      if (['day', 'tasks', 'study'].includes(extra.view)) navigate(extra.view, extra.date);
    }).catch(() => {});
  }

  const client = createLocalReminderSync({
    isNative: iosNative,
    getSettings,
    getPlan: when => reminderPlan(getData(), when, getSettings()),
    now,
    bridge: {
      async pending() {
        const result = await bridgeCall(HazeLocalReminder.pending(), 'pending');
        return result?.notifications || [];
      },
      async check() {
        const result = await bridgeCall(HazeLocalReminder.permission(), 'check');
        return result?.display || 'prompt';
      },
      async cancel(ids) {
        await bridgeCall(HazeLocalReminder.cancel({ids}), 'cancel');
      },
      async schedule(rows) {
        await bridgeCall(HazeLocalReminder.schedule({notifications: rows}), 'schedule');
      }
    }
  });

  return {
    sync: () => client.sync(),
    async test() {
      if (!iosNative()) return {status: 'skipped', count: 0};
      try {
        const permission = await bridgeCall(HazeLocalReminder.request(), 'request');
        if (permission?.display !== 'granted') return {status: 'denied', count: 0};
        await bridgeCall(HazeLocalReminder.schedule({notifications: [{
          id: 2147483646,
          title: 'Haze Flow',
          body: '알림 테스트',
          at: new Date(Date.now() + 3000).toISOString(),
          extra: {kind: 'reminder-test'}
        }]}), 'schedule');
        return {status: 'scheduled', count: 1};
      } catch {return {status: 'unsupported', count: 0}}
    },
    async permission() {
      if (!iosNative()) return 'unsupported';
      try {return (await bridgeCall(HazeLocalReminder.permission(), 'check'))?.display || 'prompt'} catch {return 'unsupported'}
    },
    async request() {
      if (!iosNative()) return 'unsupported';
      try {return (await bridgeCall(HazeLocalReminder.request(), 'request'))?.display || 'denied'} catch {return 'unsupported'}
    }
  };
}
