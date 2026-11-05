import test from 'node:test';import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {escapeRecordFilterKey} from '../cloud-query.js';
import {cloudTransport} from '../cloud.js';
const row=(id,version)=>({item_key:JSON.stringify(['logs',id]),version,mutation_id:id+'-'+version,deleted:false,payload:{id,date:'2026-11-06',time:'00:00',kind:'일상',text:id}});
test('실제 SDK의 IN 필터는 JSON 기록 식별자의 인용부호와 역슬래시를 보존한다',async()=>{
 let filter;const client=createClient('https://example.invalid','test-only',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async url=>{filter=new URL(url).searchParams.get('item_key');return new Response('[]',{headers:{'content-type':'application/json'}})}}});
 const keys=[JSON.stringify(['logs','new-record']),JSON.stringify(['routineRuns','2026-11-06','id"\\x'])];await client.from('hazeflow_records').select('item_key').in('item_key',keys.map(escapeRecordFilterKey));assert.equal(filter,'in.('+keys.map(k=>'"'+k.replaceAll('\\','\\\\').replaceAll('"','\\"')+'"').join(',')+')');assert.deepEqual(keys,[JSON.stringify(['logs','new-record']),JSON.stringify(['routineRuns','2026-11-06','id"\\x'])]);
});
test('첫 전체 로딩 이후 새 활동·종료 수정을 증분 조회하는 실제 전송 경로를 검사한다',async()=>{
 let records=[row('a',1)],detailCalls=0;const client=createClient('https://example.invalid','test-only',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async url=>{const u=new URL(url),filter=u.searchParams.get('item_key'),select=u.searchParams.get('select');let result=records;if(filter){detailCalls++;const expected='in.('+records.map(r=>'"'+escapeRecordFilterKey(r.item_key)+'"').join(',')+')';assert.equal(filter,expected);}if(select==='item_key,version')result=records.map(({item_key,version})=>({item_key,version}));return new Response(JSON.stringify(result),{headers:{'content-type':'application/json'}})}}});
 const transport=cloudTransport(client,'test-user','sandbox');await transport.pull();records=[{...row('a',2),payload:{...row('a',2).payload,endDate:'2026-11-06',endTime:'00:10'}},row('new',1)];const changed=await transport.pull();assert.equal(detailCalls,1);assert.equal(changed.find(r=>r.payload.id==='a').payload.endTime,'00:10');assert.ok(changed.some(r=>r.payload.id==='new'));
});
