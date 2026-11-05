import test from 'node:test';import assert from 'node:assert/strict';
import {replaceFavorite} from '../favorite-edit.js';import {recommendedFavorites} from '../favorite-days.js';
const row={id:'f',kind:'운동',title:'등 운동',text:'랫풀다운 15 15 3',weekdays:[2,5]};
test('does not overwrite weekday or text edits made after the editor opened, or restore deleted favorites',()=>{
 const changed={...row,weekdays:[1]},entry={...row,title:'내 제목'};
 assert.throws(()=>replaceFavorite([changed],entry,row),/바뀐 기록/);
 assert.throws(()=>replaceFavorite([],entry,row),/삭제된 기록/);
 assert.deepEqual(changed.weekdays,[1]);
 assert.deepEqual(replaceFavorite([row],entry,structuredClone(row)),[entry]);
});
test('favorite search matches all terms in name and content while retaining weekday priority',()=>{
 const other={...row,id:'other',title:'등 스트레칭',text:'스트레칭',weekdays:undefined};
 assert.deepEqual(recommendedFavorites([other,row],'운동','2026-11-06','등 랫풀다운').map(t=>t.id),['f']);
 assert.equal(recommendedFavorites([row],'운동','2026-11-06','스쿼트').length,0);
});
