/** Maps the existing reminder plan onto one iOS local-notification slot per item. */
export function notificationId(key, used = new Set()) {
  let salt = 0;
  let id = hashId(String(key));
  while (used.has(id)) id = hashId(String(key) + '#' + (++salt));
  used.add(id);
  return id;
}

function hashId(key) {
  let hash = 2166136261;
  for (const char of key) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2147483646 + 1;
}

export function localReminderPayloads(plan, now = Date.now(), {limit = 60} = {}) {
  const used = new Set();
  const rows = [];
  for (const row of plan || []) {
    if (!row || !(row.fireAt > now)) continue;
    const title = String(row.title || '').trim().slice(0, 120);
    if (!title) continue;
    if (!['day', 'tasks', 'study'].includes(row.view)) continue;
    rows.push({
      id: notificationId(row.id, used),
      title: String(row.type || '알림') + ' 알림',
      body: title,
      at: new Date(row.fireAt).toISOString(),
      extra: {kind: 'reminder', view: row.view, date: row.date, source: row.id}
    });
    if (rows.length >= limit) break;
  }
  return rows;
}

export function reconcileReminders(pending = [], next = []) {
  const nextIds = new Set(next.map(row => row.id));
  const cancel = [];
  for (const item of pending) {
    if (item?.extra?.kind !== 'reminder') continue;
    if (!nextIds.has(item.id)) cancel.push(item.id);
  }
  return {cancel, schedule: next};
}

export function createLocalReminderSync({isNative, bridge, getSettings, getPlan, now = () => Date.now()}) {
  return {
    async sync() {
      try {
        if (!isNative()) return {status: 'skipped', count: 0};
        const settings = getSettings() || {};
        const pending = await bridge.pending();
        if (!settings.enabled || !settings.system) {
          const {cancel} = reconcileReminders(pending, []);
          if (cancel.length) await bridge.cancel(cancel);
          return {status: 'cleared', count: 0};
        }
        const permission = await bridge.check();
        if (permission !== 'granted') return {status: permission === 'denied' ? 'denied' : 'prompt', count: 0};
        const next = localReminderPayloads(getPlan(new Date(now())), now());
        const diff = reconcileReminders(pending, next);
        if (diff.cancel.length) await bridge.cancel(diff.cancel);
        if (diff.schedule.length) await bridge.schedule(diff.schedule);
        return {status: 'scheduled', count: next.length};
      } catch (error) {
        const reason = String(error?.message || '');
        if (reason.startsWith('bridge:')) return {status: 'unsupported', count: 0, reason: reason.slice(7)};
        return {status: 'unsupported', count: 0};
      }
    }
  };
}
