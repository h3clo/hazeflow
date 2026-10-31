import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
test('서버 권한: 본인 기록만 조회·수정하고 원자적 버전 검사와 비공개 사진을 적용한다',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
 create table auth.users(id uuid primary key); insert into auth.users values('${alice}'),('${bob}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,storage to authenticated,anon;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id bigint generated always as identity primary key,bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant select,insert on storage.objects to authenticated; grant usage on sequence storage.objects_id_seq to authenticated;
 create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;`);
 const migration=readFileSync(new URL('../supabase/migrations/202610310001_account_sync.sql',import.meta.url),'utf8').replace(/do \$\$ begin[\s\S]*end \$\$;\s*$/,'');
 await db.exec(migration);
 const runAs=async(user,fn)=>{await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${user}',false);`);try{return await fn()}finally{await db.exec('reset role')}};
 const payload={item_key:'["logs","a"]',payload:{id:'a',text:'private'},deleted:false,base_version:0,mutation_id:crypto.randomUUID()};
 const apply=async ops=>(await db.query('select public.hazeflow_apply($1,$2::jsonb) as result',['main',JSON.stringify(ops)])).rows[0].result;
 const first=await runAs(alice,()=>apply([payload]));assert.equal(first.applied,true);assert.equal(first.rows[0].version,1);
 assert.equal((await runAs(bob,()=>db.query('select * from public.hazeflow_records'))).rows.length,0);
 assert.equal((await runAs(alice,()=>db.query('select * from public.hazeflow_records'))).rows.length,1);
 await assert.rejects(runAs(bob,()=>db.query('insert into public.hazeflow_records(user_id,space,item_key,payload,mutation_id) values($1,$2,$3,$4,$5)',[alice,'main','key','{}',crypto.randomUUID()])));
 const ownBob=await runAs(bob,()=>apply([{...payload,mutation_id:crypto.randomUUID()}]));assert.equal(ownBob.applied,true);assert.equal((await db.query('select count(*)::int as n from public.hazeflow_records')).rows[0].n,2);
 const retry=await runAs(alice,()=>apply([payload]));assert.equal(retry.rows[0].version,1);
 const stale={...payload,payload:{text:'stale'},mutation_id:crypto.randomUUID()};const other={...payload,item_key:'["logs","b"]',mutation_id:crypto.randomUUID()};const failed=await runAs(alice,()=>apply([stale,other]));assert.equal(failed.applied,false);assert.equal((await runAs(alice,()=>db.query('select * from public.hazeflow_records'))).rows.length,1);
 const deleted=await runAs(alice,()=>apply([{...payload,base_version:1,payload:null,deleted:true,mutation_id:crypto.randomUUID()}]));assert.equal(deleted.rows[0].deleted,true);assert.equal(deleted.rows[0].version,2);
 await db.exec("set role anon; select set_config('request.jwt.claim.sub','',false)");await assert.rejects(db.query('select * from public.hazeflow_records'));await assert.rejects(apply([payload]));await db.exec('reset role');
 await runAs(alice,()=>db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['hazeflow-photos',alice+'/main/photo.jpg']));
 assert.equal((await runAs(bob,()=>db.query('select * from storage.objects'))).rows.length,0);
 await assert.rejects(runAs(bob,()=>db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['hazeflow-photos',alice+'/main/bad.jpg'])));
 assert.equal((await db.query("select public from storage.buckets where id='hazeflow-photos'")).rows[0].public,false);
 }finally{await db.close()}
});
