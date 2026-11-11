/**
 * Optional live Supabase integration (isolated QA project/users only).
 * Never points at personal production data. Skips unless all required env vars are set.
 *
 * Required:
 *   HAZEFLOW_SYNC_TEST_URL
 *   HAZEFLOW_SYNC_TEST_ANON_KEY   (publishable/anon only — never service_role)
 *   HAZEFLOW_SYNC_TEST_EMAIL
 *   HAZEFLOW_SYNC_TEST_PASSWORD
 * Optional (scenario 10 — account isolation):
 *   HAZEFLOW_SYNC_TEST_EMAIL_B
 *   HAZEFLOW_SYNC_TEST_PASSWORD_B
 *
 * Invoke separately (also skipped harmlessly under `npm test` when unset):
 *   node --test tests/supabase-live.optional.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../domain.js';
import {setPrimaryPreference} from '../activity-primary.js';
import {independentTimingFields} from '../activity-timing.js';
import {itemKey,activityUiItemKey} from '../sync-state.js';
import {createSyncEngine} from '../sync-engine.js';
import {cloudTransport} from '../cloud.js';

const url=process.env.HAZEFLOW_SYNC_TEST_URL||'';
const anon=process.env.HAZEFLOW_SYNC_TEST_ANON_KEY||'';
const email=process.env.HAZEFLOW_SYNC_TEST_EMAIL||'';
const password=process.env.HAZEFLOW_SYNC_TEST_PASSWORD||'';
const emailB=process.env.HAZEFLOW_SYNC_TEST_EMAIL_B||'';
const passwordB=process.env.HAZEFLOW_SYNC_TEST_PASSWORD_B||'';
const ready=!!(url&&anon&&email&&password)&&!/YOUR_PROJECT|sb_secret_|service_role/i.test(anon);
const readyB=ready&&!!(emailB&&passwordB)&&emailB!==email;
const SPACE='sandbox';
const RUN=crypto.randomUUID().slice(0,8);
const stamp=()=>`live-${RUN}-${Date.now().toString(36)}`;

async function makeClient(){
 const {createClient}=await import('@supabase/supabase-js');
 return createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
}

async function signIn(client,{email:em,password:pw}){
 const {data,error}=await client.auth.signInWithPassword({email:em,password:pw});
 assert.equal(error,null,error?.message||'login');
 assert.ok(data.user?.id);
 return data.user;
}

function device(transport,initial=emptyState(),initialMeta=null,options={}){
 let state=structuredClone(initial),raw=initialMeta?JSON.stringify(initialMeta):null,status;
 const onlineRef={value:true};
 const files=new Map();
 const engine=createSyncEngine({
  ...options,
  transport,
  storage:options.storage||{getItem:()=>raw,setItem:v=>raw=v},
  photoStore:options.photoStore||{get:async id=>files.get(id),put:async(id,b)=>files.set(id,b)},
  read:()=>structuredClone(state),
  write:s=>state=structuredClone(s),
  onStatus:s=>status=s,
  online:()=>onlineRef.value
 });
 return {
  engine,files,onlineRef,
  get state(){return state},set state(s){state=s},
  get status(){return status},
  get meta(){return raw?JSON.parse(raw):null},
  edit(fn){fn(state)}
 };
}

function log(id,text,{time='12:00',endDate='',endTime='',independent=false}={}){
 return {
  id,date:'2026-11-11',time,kind:'일상',text,
  endDate,endTime,
  ...(independent?independentTimingFields():{})
 };
}

async function wipeSandboxKeys(client,keys){
 for(const item_key of keys){
  const {data:rows}=await client.from('hazeflow_records').select('version').eq('space',SPACE).eq('item_key',item_key).limit(1);
  const base_version=rows?.[0]?.version||0;
  if(!base_version)continue;
  await client.rpc('hazeflow_apply',{
   p_space:SPACE,
   p_changes:[{item_key,payload:null,deleted:true,base_version,mutation_id:crypto.randomUUID()}]
  });
 }
}

test('실제 서버 미검증 — HAZEFLOW_SYNC_TEST_* 없음 (skip)',{skip:ready},()=>{
 assert.ok(true,'credentials absent: live server not verified');
});

test('live secrets misconfigured as service_role/placeholder',{
 skip:!anon||!/YOUR_PROJECT|sb_secret_|service_role/i.test(anon)
},()=>{
 assert.fail('HAZEFLOW_SYNC_TEST_ANON_KEY must be publishable/anon only');
});

test('1. login and logout on isolated account',{skip:!ready},async()=>{
 const client=await makeClient();
 const user=await signIn(client,{email,password});
 assert.ok(user.id);
 const {error}=await client.auth.signOut();
 assert.equal(error,null,error?.message||'logout');
 const {data}=await client.auth.getSession();
 assert.equal(data.session,null);
});

test('2–5. dual-device activity create/end/concurrent/primary via sandbox',{skip:!ready},async()=>{
 const clientA=await makeClient();
 const clientB=await makeClient();
 const user=await signIn(clientA,{email,password});
 await signIn(clientB,{email,password});
 const transportA=cloudTransport(clientA,user.id,SPACE);
 const transportB=cloudTransport(clientB,user.id,SPACE);
 const a=device(transportA);
 const b=device(transportB);
 const idCreate=`act-create-${RUN}`;
 const idEnd=`act-end-${RUN}`;
 const idIndieA=`act-indie-a-${RUN}`;
 const idIndieB=`act-indie-b-${RUN}`;
 const touched=[
  itemKey('logs',idCreate),
  itemKey('logs',idEnd),
  itemKey('logs',idIndieA),
  itemKey('logs',idIndieB),
  activityUiItemKey()
 ];
 try{
  a.edit(s=>s.logs.push(log(idCreate,'기기A 생성',{independent:true})));
  await a.engine.sync();
  assert.equal(a.status.phase,'synced',a.status.error||'a create sync');
  await b.engine.sync();
  assert.ok(b.state.logs.find(l=>l.id===idCreate),'B sees create');

  a.edit(s=>s.logs.push(log(idEnd,'종료 대상',{time:'10:00',independent:true})));
  await a.engine.sync();
  await b.engine.sync();
  a.edit(s=>{
   const row=s.logs.find(l=>l.id===idEnd);
   row.endDate='2026-11-11';
   row.endTime='11:00';
  });
  await a.engine.sync();
  await b.engine.sync();
  assert.equal(b.state.logs.find(l=>l.id===idEnd)?.endTime,'11:00');

  a.edit(s=>s.logs.push(log(idIndieA,'동시A',{time:'13:00',independent:true})));
  b.edit(s=>s.logs.push(log(idIndieB,'동시B',{time:'13:05',independent:true})));
  await a.engine.sync();
  await b.engine.sync();
  await a.engine.sync();
  assert.ok(a.state.logs.find(l=>l.id===idIndieA));
  assert.ok(a.state.logs.find(l=>l.id===idIndieB));
  assert.ok(b.state.logs.find(l=>l.id===idIndieA));
  assert.ok(b.state.logs.find(l=>l.id===idIndieB));
  assert.equal(a.state.logs.find(l=>l.id===idIndieA).activityTiming,'independent');

  a.edit(s=>setPrimaryPreference(s,idIndieA,{at:Date.now(),deviceId:'live-a'}));
  await a.engine.sync();
  await b.engine.sync();
  assert.equal(b.state.preferences?.activityUi?.primaryActivityId,idIndieA);
 }finally{
  a.engine.stop();
  b.engine.stop();
  await wipeSandboxKeys(clientA,touched);
  await clientA.auth.signOut();
  await clientB.auth.signOut();
 }
});

test('6. offline edits sync after reconnect',{skip:!ready},async()=>{
 const client=await makeClient();
 const user=await signIn(client,{email,password});
 const transport=cloudTransport(client,user.id,SPACE);
 const a=device(transport);
 const id=`act-off-${RUN}`;
 const key=itemKey('logs',id);
 try{
  a.onlineRef.value=false;
  a.edit(s=>s.logs.push(log(id,'오프라인',{independent:true})));
  await a.engine.sync();
  assert.equal(a.status.phase,'offline');
  const {data:before}=await client.from('hazeflow_records').select('item_key').eq('space',SPACE).eq('item_key',key);
  assert.equal((before||[]).length,0);
  a.onlineRef.value=true;
  await a.engine.sync();
  assert.equal(a.status.phase,'synced',a.status.error||'reconnect');
  const {data:after}=await client.from('hazeflow_records').select('payload').eq('space',SPACE).eq('item_key',key);
  assert.equal(after?.[0]?.payload?.text,'오프라인');
 }finally{
  a.engine.stop();
  await wipeSandboxKeys(client,[key]);
  await client.auth.signOut();
 }
});

test('7–8. conflict reject + idempotent mutation / no duplicate loss',{skip:!ready},async()=>{
 const client=await makeClient();
 const user=await signIn(client,{email,password});
 const id=`act-conflict-${RUN}`;
 const item_key=itemKey('logs',id);
 const mutation_id=crypto.randomUUID();
 const payload=log(id,'원본',{independent:true});
 try{
  const first=await client.rpc('hazeflow_apply',{
   p_space:SPACE,
   p_changes:[{item_key,payload,deleted:false,base_version:0,mutation_id}]
  });
  assert.equal(first.error,null,first.error?.message||'first apply');
  assert.equal(first.data.applied,true);
  const version=first.data.rows[0].version;

  const stale=await client.rpc('hazeflow_apply',{
   p_space:SPACE,
   p_changes:[{item_key,payload:{...payload,text:'스테일'},deleted:false,base_version:0,mutation_id:crypto.randomUUID()}]
  });
  assert.equal(stale.error,null,stale.error?.message||'stale');
  assert.equal(stale.data.applied,false);
  assert.ok(stale.data.conflicts?.length);

  const replay=await client.rpc('hazeflow_apply',{
   p_space:SPACE,
   p_changes:[{item_key,payload,deleted:false,base_version:0,mutation_id}]
  });
  assert.equal(replay.error,null,replay.error?.message||'replay');
  assert.equal(replay.data.applied,true);
  assert.equal(replay.data.rows[0].version,version);

  const next=await client.rpc('hazeflow_apply',{
   p_space:SPACE,
   p_changes:[{item_key,payload:{...payload,text:'갱신'},deleted:false,base_version:version,mutation_id:crypto.randomUUID()}]
  });
  assert.equal(next.data.applied,true);
  const {data:rows}=await client.from('hazeflow_records').select('payload,version').eq('space',SPACE).eq('item_key',item_key);
  assert.equal(rows?.[0]?.payload?.text,'갱신');
  assert.equal(rows?.[0]?.version,version+1);
 }finally{
  await wipeSandboxKeys(client,[item_key]);
  await client.auth.signOut();
 }
});

test('9. legacy chain and independent timing coexist on server',{skip:!ready},async()=>{
 const client=await makeClient();
 const user=await signIn(client,{email,password});
 const transport=cloudTransport(client,user.id,SPACE);
 const a=device(transport);
 const legacyId=`legacy-${RUN}`;
 const indieId=`indie-${RUN}`;
 const keys=[itemKey('logs',legacyId),itemKey('logs',indieId)];
 try{
  a.edit(s=>{
   s.logs.push(log(legacyId,'레거시 체인',{time:'09:00'}));
   s.logs.push(log(indieId,'독립 타이밍',{time:'09:30',independent:true}));
  });
  await a.engine.sync();
  assert.equal(a.status.phase,'synced',a.status.error||'legacy sync');
  // Fetch keys one-by-one — PostgREST `in()` is unsafe for JSON item_key commas.
  const byKey={};
  for(const key of keys){
   const {data:rows,error}=await client.from('hazeflow_records').select('item_key,payload').eq('space',SPACE).eq('item_key',key).limit(1);
   assert.equal(error,null,error?.message||'read '+key);
   byKey[key]=rows?.[0]?.payload;
  }
  assert.equal(byKey[itemKey('logs',legacyId)]?.activityTiming,undefined);
  assert.equal(byKey[itemKey('logs',indieId)]?.activityTiming,'independent');
  assert.equal(a.state.logs.find(l=>l.id===indieId)?.activityTiming,'independent');
 }finally{
  a.engine.stop();
  await wipeSandboxKeys(client,keys);
  await client.auth.signOut();
 }
});

test('10. account switch isolation (second QA user)',{skip:!readyB},async()=>{
 const clientA=await makeClient();
 const clientB=await makeClient();
 const userA=await signIn(clientA,{email,password});
 const userB=await signIn(clientB,{email:emailB,password:passwordB});
 assert.notEqual(userA.id,userB.id);
 const item_key=itemKey('logs',`iso-${RUN}`);
 const mutation_id=crypto.randomUUID();
 try{
  const applied=await clientA.rpc('hazeflow_apply',{
   p_space:SPACE,
   p_changes:[{item_key,payload:log(`iso-${RUN}`,'A만',{independent:true}),deleted:false,base_version:0,mutation_id}]
  });
  assert.equal(applied.data.applied,true);
  const {data:fromB}=await clientB.from('hazeflow_records').select('item_key').eq('space',SPACE).eq('item_key',item_key);
  assert.equal((fromB||[]).length,0);
  const {data:fromA}=await clientA.from('hazeflow_records').select('payload').eq('space',SPACE).eq('item_key',item_key);
  assert.equal(fromA?.[0]?.payload?.text,'A만');
 }finally{
  await wipeSandboxKeys(clientA,[item_key]);
  await clientA.auth.signOut();
  await clientB.auth.signOut();
 }
});
