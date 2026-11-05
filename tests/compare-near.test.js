import test from 'node:test';import assert from 'node:assert/strict';
import {emptyState} from '../domain.js';import {nearestRecordedDate} from '../insights.js';
test('suggests the nearest actual day, excluding baseline, future and plan-only days',()=>{
 const d=emptyState();d.events=[{id:'plan',date:'2026-10-01',status:'planned'}];d.diary={'2026-09-30':{entry:'과거 일기'},'2026-10-02':{note:'다른 날'},'2026-11-06':{entry:'기준일'},'2026-12-01':{entry:'미래'}};
 assert.equal(nearestRecordedDate(d,'2026-10-01','2026-11-06'),'2026-09-30');
 assert.equal(nearestRecordedDate(d,'2026-11-05','2026-11-06'),'2026-10-02');
 assert.equal(nearestRecordedDate(emptyState(),'2026-10-01','2026-11-06'),'');
});
