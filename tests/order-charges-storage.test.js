import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {openRecordStorage} from '../indexed-record-storage.js';
import {openSyncJournal} from '../sync-journal-store.js';
import {createSyncEngine} from '../sync-engine.js';
import {emptyState,validateBackup} from '../domain.js';
import {applyPurchaseProposals} from '../purchase-import.js';

const memory=()=>{const m=new Map();return {get length(){return m.size},key:i=>[...m.keys()][i],getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
const fixture=()=>({local:memory(),indexedDB:new IDBFactory(),namespace:'hazeflow-cost-test',channelFactory:()=>null});
const state=()=>{const d=emptyState();d.logs=[{id:'order',date:'2026-01-01',time:'12:00',kind:'가계부',memo:true,text:'원문',photos:[{id:'keep-photo',name:'test.jpg',type:'image/jpeg',width:1,height:1,bytes:3}],money:{type:'expense',merchant:'네이버',currency:'KRW',amount:3000,category:'뷰티',payment:'카드',order:{platform:'네이버',id:'test-order',item:'무료 샘플'}}},{id:'meal',date:'2026-01-01',time:'13:00',kind:'식사',text:'점심',expenseId:'order'}];return d};
const proposal=()=>({id:'order',date:'2026-01-01',platform:'네이버',orderId:'test-order',expectedOrderItem:'무료 샘플',expectedAmount:3000,items:[{name:'무료 샘플',family:'샘플',category:'뷰티',quantity:15,unit:'ml',amount:0}],charges:{shipping:3000}});

test('최신 저장 트랜잭션에서 달라진 결제액을 확인하고 오래된 보완을 건너뛴다',async()=>{
 const f=fixture(),a=await openRecordStorage(f),b=await openRecordStorage(f),key=f.namespace;
 try{
  await a.setItem(key,JSON.stringify(state()));
  await b.update(key,raw=>{const d=JSON.parse(raw);d.logs[0].money.amount=2500;d.logs[0].text='최신 메모';return JSON.stringify(d)});
  let result;
  await a.update(key,raw=>{const d=JSON.parse(raw);result=applyPurchaseProposals(d.logs,[proposal()]);return JSON.stringify(d)});
  assert.deepEqual(result,{changed:0,skipped:1});const saved=JSON.parse(await a.read(key));
  assert.equal(saved.logs[0].money.amount,2500);assert.equal(saved.logs[0].text,'최신 메모');assert.equal(saved.logs[0].money.order.charges,undefined);
  assert.deepEqual(saved.logs[0].photos,state().logs[0].photos);assert.equal(saved.logs[1].expenseId,'order');
 }finally{a.close();b.close()}
});

test('비용·0원 상품은 IndexedDB 재시작 후 동기화 전송에도 남고 사진·식사 연결을 보존한다',async()=>{
 const f=fixture(),key=f.namespace;let store=await openRecordStorage(f),engine;
 try{
  const original=state();await store.setItem(key,JSON.stringify(original));
  await store.update(key,raw=>{const d=JSON.parse(raw);assert.deepEqual(applyPurchaseProposals(d.logs,[proposal()]),{changed:1,skipped:0});return JSON.stringify(d)});
  store.close();store=await openRecordStorage(f);
  const restored=JSON.parse(await store.read(key));assert.deepEqual(validateBackup(restored),restored);
  assert.deepEqual(restored.logs[0].photos,original.logs[0].photos);assert.deepEqual(restored.logs[1],original.logs[1]);
  const journal=await openSyncJournal({key:key+'-sync',legacy:f.local,indexedDB:f.indexedDB}),remote=new Map();let status;
  engine=createSyncEngine({storage:journal,photoStore:{get:async()=>new Blob(['abc'],{type:'image/jpeg'})},read:()=>JSON.parse(store.getItem(key)),write:s=>store.setItem(key,JSON.stringify(s)),online:()=>true,onStatus:s=>status=s,transport:{uploadPhoto:async()=>{},pull:async()=>[...remote.values()],async push(ops){const rows=ops.map(op=>({...op,version:1}));for(const row of rows)remote.set(row.item_key,row);return {applied:true,rows}}}});
  await engine.sync();assert.equal(status.phase,'synced');const sent=[...remote.values()].find(r=>r.payload?.id==='order').payload;
  assert.equal(sent.money.order.items[0].amount,0);assert.deepEqual(sent.money.order.charges,{shipping:3000});assert.equal(sent.money.amount,3000);
 }finally{engine?.stop();store.close()}
});
