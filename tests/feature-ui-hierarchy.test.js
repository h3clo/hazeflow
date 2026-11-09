import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../domain.js';
import {featureUI} from '../feature-ui.js';

const ui=featureUI({
 esc:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 btn:(label,act,id='',cls='')=>`<button data-act="${act}" data-id="${id}" class="${cls}">${label}</button>`,
 card:(title,body)=>`<section class="card"><h2>${title}</h2>${body}</section>`,
 empty:msg=>`<p class="empty">${msg}</p>`,
 field:()=>'',
 photoGallery:photos=>photos.length?`<div class="photos">${photos.length}</div>`:'',
 originalAttribute:()=>''
});

test('주간 회고는 사용자 회고를 집계보다 먼저 보여준다',()=>{
 const d=emptyState();
 d.weeklyReviews={'2026-11-02':{remember:'가벼운 산책',adjust:'',next:''}};
 const html=ui.review(d,'2026-11-08');
 const story=html.indexOf('나의 주간 회고');
 const metrics=html.indexOf('review-metrics');
 const overview=html.indexOf('review-overview');
 assert.ok(story>=0);
 assert.ok(metrics>story);
 assert.ok(overview>metrics);
 assert.match(html,/<details class="review-metrics">/);
 assert.match(html,/data-form="weekly-review"/);
 assert.match(html,/가벼운 산책/);
});

test('과거 비교는 스냅샷임을 밝히고 빈 날엔 가까운 기록·일기·사진을 강조한다',()=>{
 const d=emptyState();
 d.diary={'2026-09-30':{entry:'가을 일기',photos:['p1']},'2026-11-08':{entry:'오늘'}};
 d.logs=[{id:'m1',date:'2026-09-30',time:'12:00',kind:'식사',text:'김밥',photos:['p2']}];
 const html=ui.compare(d,'2026-11-08','2026-10-01');
 assert.match(html,/그날의 스냅샷/);
 assert.match(html,/기간 전체 집계는 아니에요/);
 assert.match(html,/compare-discovery/);
 assert.match(html,/2026-09-30/);
 assert.match(html,/일기/);
 assert.match(html,/사진/);
 assert.match(html,/compare-near/);
 assert.match(html,/snapshot-memory/);
});
