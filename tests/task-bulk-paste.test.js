import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateBackup} from '../domain.js';
import {itemKey,flattenState,unflattenState} from '../sync-state.js';
import {
  parseTaskBulkText,
  planTaskBulkImport,
  applyTaskBulkImport,
  taskBulkDuplicateKey,
} from '../task-bulk-paste.js';
import {IDBFactory} from 'fake-indexeddb';
import {openRecordStorage} from '../indexed-record-storage.js';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const sampleText = [
  '2026-01-02 가상 예시 할 일 A',
  '2026-01-03 가상 예시 할 일 B',
  '',
  'not-a-date 잘못됨',
  '2026-01-02 가상 예시 할 일 A',
].join('\n');

test('여러 줄 붙여넣기는 날짜·제목을 파싱하고 빈 줄·형식 오류를 분리한다', () => {
  const parsed = parseTaskBulkText(sampleText);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].dueDate, '2026-01-02');
  assert.equal(parsed.rows[0].title, '가상 예시 할 일 A');
  assert.equal(parsed.invalid.length, 1);
  assert.ok(parsed.skipped >= 1);
  assert.equal(parseTaskBulkText('').ok, false);
});

test('같은 날짜·제목은 중복으로 건너뛰고 기존 할 일은 보존한다', () => {
  const d = emptyState();
  d.tasks = [{
    id: 'keep',
    title: '가상 예시 할 일 A',
    listName: '할 일',
    dueDate: '2026-01-02',
    dueTime: '',
    date: '2026-01-02',
    done: false,
    flagged: false,
    note: '기존',
    completedOn: null,
  }];
  const parsed = parseTaskBulkText(sampleText);
  const plan = planTaskBulkImport(d.tasks, parsed.rows);
  assert.equal(plan.accepted.length, 1);
  assert.equal(plan.duplicates.length, 1);
  assert.equal(plan.accepted[0].title, '가상 예시 할 일 B');
  const before = d.tasks.length;
  applyTaskBulkImport(d, plan.accepted, {uid: () => 'new-1', createdOn: '2026-01-01'});
  assert.equal(d.tasks.length, before + 1);
  assert.equal(d.tasks.find((t) => t.id === 'keep').note, '기존');
  validateBackup(d);
});

test('계정별 IndexedDB 키에 넣은 할 일은 다른 네임스페이스에서 보이지 않는다', async () => {
  const memory = () => {
    const m = new Map();
    return {
      get length() { return m.size; },
      key: (i) => [...m.keys()][i],
      getItem: (k) => m.get(k) ?? null,
      setItem: (k, v) => m.set(k, v),
    };
  };
  const aliceStore = await openRecordStorage({local: memory(), indexedDB: new IDBFactory(), namespace: 'bulk-alice', channelFactory: () => null});
  const bobStore = await openRecordStorage({local: memory(), indexedDB: new IDBFactory(), namespace: 'bulk-bob', channelFactory: () => null});
  const alice = emptyState();
  applyTaskBulkImport(alice, [{dueDate: '2026-02-01', title: '가상 Alice 전용'}], {uid: () => 't-a'});
  await aliceStore.setItem('bulk-alice', JSON.stringify(alice));
  assert.equal(bobStore.getItem('bulk-bob'), null);
  const bobState = emptyState();
  await bobStore.setItem('bulk-bob', JSON.stringify(bobState));
  assert.equal(JSON.parse(bobStore.getItem('bulk-bob')).tasks.length, 0);
  assert.match(aliceStore.getItem('bulk-alice'), /가상 Alice 전용/);
  assert.doesNotMatch(bobStore.getItem('bulk-bob') || '', /가상 Alice 전용/);
  aliceStore.close();
  bobStore.close();
});

test('Supabase RLS: 한 계정의 할 일 동기화 행은 다른 계정에서 조회되지 않는다', async () => {
  const alice = '11111111-1111-4111-8111-111111111111';
  const bob = '22222222-2222-4222-8222-222222222222';
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
 create table auth.users(id uuid primary key); insert into auth.users values('${alice}'),('${bob}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,storage to authenticated,anon;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id bigint generated always as identity primary key,bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant select,insert on storage.objects to authenticated; grant usage on sequence storage.objects_id_seq to authenticated;
 create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;`);
    const migration = readFileSync(new URL('../supabase/migrations/202610310001_account_sync.sql', import.meta.url), 'utf8').replace(/do \$\$ begin[\s\S]*end \$\$;\s*$/, '');
    await db.exec(migration);
    const runAs = async (user, fn) => {
      await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${user}',false);`);
      try { return await fn(); } finally { await db.exec('reset role'); }
    };
    const state = emptyState();
    applyTaskBulkImport(state, [{dueDate: '2026-03-01', title: '가상 RLS 할 일'}], {uid: () => 'task-rls-1'});
    const flat = flattenState(state);
    const taskKey = itemKey('tasks', 'task-rls-1');
    assert.ok(flat[taskKey]);
    const op = {
      item_key: taskKey,
      payload: flat[taskKey],
      deleted: false,
      base_version: 0,
      mutation_id: crypto.randomUUID(),
    };
    const apply = async (ops) => (await db.query('select public.hazeflow_apply($1,$2::jsonb) as result', ['main', JSON.stringify(ops)])).rows[0].result;
    const first = await runAs(alice, () => apply([op]));
    assert.equal(first.applied, true);
    assert.equal((await runAs(bob, () => db.query('select * from public.hazeflow_records where item_key=$1', [taskKey]))).rows.length, 0);
    const aliceRows = await runAs(alice, () => db.query('select payload->>\'title\' as title from public.hazeflow_records where item_key=$1', [taskKey]));
    assert.equal(aliceRows.rows[0].title, '가상 RLS 할 일');
    assert.deepEqual(unflattenState({[taskKey]: flat[taskKey]}).tasks[0].dueDate, '2026-03-01');
    assert.equal(taskBulkDuplicateKey({dueDate: '2026-03-01', title: '가상 RLS 할 일'}), '2026-03-01\0가상 RLS 할 일');
  } finally {
    await db.close();
  }
});
