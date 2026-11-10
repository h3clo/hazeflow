import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeVideoUrl,recentVideoFavorites,markVideoOpened,videoFavoriteCount,validVideoFavoriteFields} from '../favorite-videos.js';
import {templateEntry} from '../insights.js';
import {emptyState,validateBackup,allDocument} from '../domain.js';

test('YouTube https 링크만 영상 즐겨찾기로 받는다',()=>{
 assert.ok(normalizeVideoUrl('https://youtu.be/abcdefghijk'));
 assert.ok(normalizeVideoUrl('https://www.youtube.com/watch?v=abcdefghijk'));
 assert.equal(normalizeVideoUrl('http://youtu.be/abcdefghijk'),null);
 assert.equal(normalizeVideoUrl('https://example.com/watch'),null);
 assert.equal(normalizeVideoUrl('javascript:alert(1)'),null);
});

test('영상 즐겨찾기는 백업에 남고 최근 연 순으로 선반에 오른다',()=>{
 const d=emptyState();
 d.favorites=[
  templateEntry({kind:'영상',title:'스트레칭',text:'https://youtu.be/stretch01'},'v1'),
  templateEntry({kind:'영상',title:'공복 홈트',text:'https://youtu.be/homeworkout',note:'공복'},'v2'),
  templateEntry({kind:'운동',title:'풀업',text:'어시스트풀업 55 12 3'},'w1'),
 ];
 d.favorites=markVideoOpened(d.favorites,'v2',200);
 d.favorites=markVideoOpened(d.favorites,'v1',100);
 const restored=validateBackup(JSON.parse(JSON.stringify(d)));
 assert.equal(videoFavoriteCount(restored.favorites),2);
 assert.deepEqual(recentVideoFavorites(restored.favorites,3).map(t=>t.id),['v2','v1']);
 assert.equal(validVideoFavoriteFields(restored.favorites.find(t=>t.id==='v2')),true);
 assert.match(allDocument(restored),/영상 · 공복 홈트/);
 assert.match(allDocument(restored),/메모: 공복/);
});

test('세션·캡처에 접힌 영상 선반과 열기 경로를 연결한다',()=>{
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.ok(source.includes('workout-video-fold'));
 assert.ok(source.includes('open-video-favorite'));
 assert.ok(source.includes('new-video-favorite'));
 assert.ok(source.includes('workoutVideoShelf()'));
});
