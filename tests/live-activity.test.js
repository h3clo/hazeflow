import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../domain.js';
import {setPrimaryPreference} from '../activity-primary.js';
import {createLiveActivityClient,liveActivityPayload,liveActivityTitle} from '../live-activity.js';

const now=new Date('2026-11-11T10:00:00');

function log(id,time,text,{end=false,kind='업무'}={}){
 return {id,date:'2026-11-11',time,kind,text,activityTiming:'independent',...(end?{endDate:'2026-11-11',endTime:'09:30'}:{})};
}

test('대표로 지정된 진행 중 활동만 페이로드가 된다',()=>{
 const state=emptyState();
 state.logs.push(log('early','09:00','alpha work'),log('late','09:40','beta work'));
 const chosen=liveActivityPayload(state,'early',now);
 assert.equal(chosen.recordId,'early');
 assert.equal(chosen.title,'alpha work');
 assert.equal(chosen.kind,'업무');
 assert.equal(chosen.primary,true);
 assert.equal(chosen.startedAt,new Date('2026-11-11T09:00:00').toISOString());
});

test('없는 대표는 기존 대표 규칙의 마지막 진행 중으로 돌아간다',()=>{
 const state=emptyState();
 state.logs.push(log('early','09:00','alpha'),log('late','09:40','beta'));
 assert.equal(liveActivityPayload(state,'missing',now).recordId,'late');
 assert.equal(liveActivityPayload(state,null,now).recordId,'late');
});

test('끝난 대표는 넘기지 않고 남은 진행 중을 고른다',()=>{
 const state=emptyState();
 state.logs.push(log('done','09:00','finished',{end:true}),log('still','09:10','still going'));
 setPrimaryPreference(state,'done',{at:1,deviceId:'phone'});
 assert.equal(liveActivityPayload(state,'done',now).recordId,'still');
});

test('진행 중이 없으면 종료 신호다',()=>{
 const state=emptyState();
 state.logs.push(log('done','09:00','finished',{end:true}));
 assert.equal(liveActivityPayload(state,'done',now),null);
});

test('제목은 첫 줄 42자만 쓴다',()=>{
 assert.equal(liveActivityTitle({text:'  first line \nsecond'}), 'first line');
 assert.equal(liveActivityTitle({text:'가'.repeat(50)}).length,42);
 assert.equal(liveActivityTitle({text:''}),'활동');
});

test('네이티브가 아니면 브리지를 호출하지 않는다',async()=>{
 let calls=0;
 const client=createLiveActivityClient({isNative:()=>false,bridge:{async sync(){calls+=1;return {status:'started'}}}});
 const state=emptyState();
 state.logs.push(log('only','09:00','solo'));
 const result=await client.sync(state,null,now);
 assert.equal(result.status,'skipped');
 assert.equal(calls,0);
});

test('겹친 동기화는 마지막 상태만 브리지에 보낸다',async()=>{
 const calls=[];
 const client=createLiveActivityClient({
  isNative:()=>true,
  bridge:{async sync(payload){calls.push(payload);return {status:payload.end?'ended':'updated'}}}
 });
 const state=emptyState();
 state.logs.push(log('only','09:00','solo'));
 const first=client.sync(state,'only',now);
 const second=client.sync(emptyState(),null,now);
 const [earlier,later]=await Promise.all([first,second]);
 assert.equal(earlier.status,'stale');
 assert.equal(later.status,'ended');
 assert.deepEqual(calls,[{end:true}]);
});

test('브리지 실패는 기록 저장과 분리된 unsupported다',async()=>{
 const client=createLiveActivityClient({
  isNative:()=>true,
  bridge:{async sync(){throw Error('activity unavailable')}}
 });
 const state=emptyState();
 state.logs.push(log('only','09:00','solo'));
 const result=await client.sync(state,'only',now);
 assert.equal(result.status,'unsupported');
 assert.equal(result.recordId,'only');
});
