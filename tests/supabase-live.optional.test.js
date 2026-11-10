/**
 * Optional live Supabase round-trip.
 * Skips unless HAZEFLOW_SYNC_TEST_URL + HAZEFLOW_SYNC_TEST_ANON_KEY + HAZEFLOW_SYNC_TEST_EMAIL + HAZEFLOW_SYNC_TEST_PASSWORD
 * point at an isolated test project/user (never production personal data).
 * Not run in default `npm test` — invoke:
 *   node --test tests/supabase-live.optional.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const url=process.env.HAZEFLOW_SYNC_TEST_URL||'';
const anon=process.env.HAZEFLOW_SYNC_TEST_ANON_KEY||'';
const email=process.env.HAZEFLOW_SYNC_TEST_EMAIL||'';
const password=process.env.HAZEFLOW_SYNC_TEST_PASSWORD||'';
const ready=!!(url&&anon&&email&&password)&&!/YOUR_PROJECT|sb_secret_|service_role/i.test(anon);

test('live Supabase: isolated account can store preferences.activityUi',{skip:!ready},async()=>{
 const {createClient}=await import('@supabase/supabase-js');
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error:authError}=await client.auth.signInWithPassword({email,password});
 assert.equal(authError,null,authError?.message||'login');
 assert.ok(auth.user?.id);
 const item_key=JSON.stringify(['preferences','activityUi']);
 const mutation_id=crypto.randomUUID();
 const payload={primaryActivityId:'live-probe-'+mutation_id.slice(0,8),primaryUpdatedAt:Date.now(),primaryUpdatedBy:'ci-probe'};
 const {data:apply,error:applyError}=await client.rpc('hazeflow_apply',{p_space:'sandbox',p_ops:[{item_key,payload,deleted:false,base_version:0,mutation_id}]});
 assert.equal(applyError,null,applyError?.message||'apply');
 assert.equal(apply?.applied,true);
 const {data:rows,error:readError}=await client.from('hazeflow_records').select('payload,deleted').eq('space','sandbox').eq('item_key',item_key);
 assert.equal(readError,null,readError?.message||'read');
 assert.equal(rows?.[0]?.payload?.primaryActivityId,payload.primaryActivityId);
 await client.rpc('hazeflow_apply',{p_space:'sandbox',p_ops:[{item_key,payload:null,deleted:true,base_version:apply.rows[0].version,mutation_id:crypto.randomUUID()}]});
 await client.auth.signOut();
});

test('live Supabase credentials are not configured — skipped in CI by default',{skip:ready},()=>{
 assert.ok(true);
});
