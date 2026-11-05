import test from 'node:test';import assert from 'node:assert/strict';
import {searchDiaries,diaryExcerpt} from '../diary-search.js';
test('searches full diary entries, notes and tomorrow text across dates',()=>{
 const diary={'2020-01-01':{entry:'스페인 여행 계획',tomorrow:'항공권 알아보기'},'2026-11-06':{note:'오늘 Database 공부'},'2026-11-05':{entry:''}};
 assert.deepEqual(searchDiaries(diary,{query:'스페인 항공권',date:'2026-11-06'}).map(x=>x.date),['2020-01-01']);
 assert.equal(searchDiaries(diary,{query:'database'}).length,1);
 assert.equal(searchDiaries(diary,{date:'2026-11-05'}).length,0);
 assert.equal(searchDiaries(diary,{date:'2026-11-06'}).length,1);
});
test('shows matching context in long entries and supports mood/photo-only diaries',()=>{
 const row={entry:'가'.repeat(500)+' 복습 완료 '+'나'.repeat(500)};const excerpt=diaryExcerpt(row,'복습');
 assert.match(excerpt,/복습 완료/);assert.ok(excerpt.length<=242);
 assert.equal(searchDiaries({'2026-11-06':{mood:'great'}},{query:'좋았어'}).length,1);
 assert.equal(searchDiaries({'2026-11-06':{photos:[{id:'p'}]}},{date:'2026-11-06'}).length,1);
});
