import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../domain.js';
import {createSyncEngine} from '../sync-engine.js';
import {itemKey} from '../sync-state.js';

// Synthetic Mac/iPhone round trips only. No Supabase client, credentials, or real user data.
const activity=()=>({id:'qa-activity',date:'2026-11-15',time:'09:00',kind:'일상',text:'가상 활동',activityTiming:'independent'});
function server(){
 const rows={};
 return {rows,async pull(){return structuredClone(Object.values(rows))},
 async push(ops){
  if(ops.some(op=>(rows[op.item_key]?.version||0)!==op.base_version&&rows[op.item_key]?.mutation_id!==op.mutation_id))return {applied:false,rows:[]};
  const result=[];
  for(const op of ops){
   const prior=rows[op.item_key];
   if(prior?.mutation_id===op.mutation_id){result.push(prior);continue;}
   rows[op.item_key]={...structuredClone(op),version:(prior?.version||0)+1};
   result.push(rows[op.item_key]);
  }
  return {applied:true,rows:structuredClone(result)};
 },async uploadPhoto(){},async downloadPhoto(){return new Blob([])}};
}
function device(transport){
 let state=emptyState(),saved=null,status;
 const engine=createSyncEngine({transport,storage:{getItem:()=>saved,setItem:v=>{saved=v}},
 photoStore:{get:async()=>null,put:async()=>{}},read:()=>structuredClone(state),
 write:s=>{state=structuredClone(s)},onStatus:s=>{status=s},online:()=>true});
 return {engine,get state(){return state},get status(){return status},edit(fn){fn(state)}};
}
const finish=s=>Object.assign(s.logs[0],{endDate:'2026-11-15',endTime:'10:30'});
test('HAZE-SYNC-01 Mac start -> iPhone end -> Mac pull shows finished, no resurrection',async()=>{
 const cloud=server(),mac=device(cloud),phone=device(cloud),key=itemKey('logs','qa-activity');
 try{
  mac.edit(s=>s.logs.push(activity()));await mac.engine.sync();
  await phone.engine.sync();assert.equal(phone.state.logs[0].id,'qa-activity');
  finish(phone.state);await phone.engine.sync();
  assert.equal(cloud.rows[key].payload.endTime,'10:30');
  await mac.engine.sync();
  assert.equal(mac.state.logs[0].endTime,'10:30');
  assert.equal(mac.status.phase,'synced');
  await mac.engine.sync();
  assert.equal(cloud.rows[key].payload.endTime,'10:30');
 }finally{mac.engine.stop();phone.engine.stop();}
});
test('HAZE-SYNC-02 stale Mac pending start cannot erase iPhone completion',async()=>{
 const cloud=server(),mac=device(cloud),phone=device(cloud),key=itemKey('logs','qa-activity');
 try{
  mac.edit(s=>s.logs.push(activity()));await mac.engine.sync();await phone.engine.sync();
  finish(phone.state);await phone.engine.sync();
  // Mac still holds the stale open state and requests a sync.
  await mac.engine.schedule(60000);await mac.engine.sync();
  assert.equal(mac.state.logs[0].endTime,'10:30');
  assert.equal(cloud.rows[key].payload.endTime,'10:30');
 }finally{mac.engine.stop();phone.engine.stop();}
});
test('HAZE-SYNC-03 concurrent Mac memo edit preserves phone completion',async()=>{
 const cloud=server(),mac=device(cloud),phone=device(cloud),key=itemKey('logs','qa-activity');
 try{
  mac.edit(s=>s.logs.push(activity()));await mac.engine.sync();await phone.engine.sync();
  mac.edit(s=>{s.logs[0].text='맥에서 수정한 메모';});
  finish(phone.state);await phone.engine.sync();await mac.engine.sync();
  assert.equal(mac.state.logs[0].endTime,'10:30');
  assert.equal(mac.state.logs[0].text,'맥에서 수정한 메모');
  assert.equal(cloud.rows[key].payload.endTime,'10:30');
  assert.equal(cloud.rows[key].payload.text,'맥에서 수정한 메모');
 }finally{mac.engine.stop();phone.engine.stop();}
});
