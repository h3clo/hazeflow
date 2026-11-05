import test from 'node:test';import assert from 'node:assert/strict';
import {searchStudyRows,readStudy} from '../study.js';
const log=(id,subject,topic,extra={})=>({id,date:'2026-11-05',kind:'공부',text:topic,study:readStudy({subject,topic,...extra})});
test('finds older records beyond the first page, including answers and renamed subjects',()=>{
 const data={studySubjects:[{id:'base-development',name:'프로그래밍',archived:true}],logs:[...Array.from({length:70},(_,i)=>log('x'+i,'영어','회화')),log('target','개발','정규화',{answer:'Database 중복 제거'})]};
 assert.equal(searchStudyRows(data,'2026-11-06',{query:'프로그래밍 database'}).at(0).id,'target');
 assert.equal(searchStudyRows(data,'2026-11-06',{subjectId:'base-development'}).length,1);
 assert.equal(searchStudyRows(data,'2026-11-04').length,0);
});
test('includes plain study logs, uses all search terms, and excludes mirrored records',()=>{
 const data={logs:[{id:'plain',kind:'공부',date:'2026-11-05',text:'한국사 복습'},{...log('mirror','영어','회화'),sourceId:'other'},log('normal','영어','회화')]};
 assert.deepEqual(searchStudyRows(data,'2026-11-06',{subjectId:'unassigned',query:'한국사 복습'}).map(l=>l.id),['plain']);
 assert.equal(searchStudyRows(data,'2026-11-06',{query:'회화 한국사'}).length,0);
});
