-- Only the signed-in account can read its rows. Writes go through the revision-checked RPC.
create table if not exists public.hazeflow_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  space text not null default 'main' check (space in ('main','sandbox')),
  item_key text not null check (length(item_key) between 3 and 600),
  payload jsonb,
  deleted boolean not null default false,
  version bigint not null default 1 check (version > 0),
  mutation_id uuid not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, space, item_key),
  check (deleted or payload is not null)
);
alter table public.hazeflow_records enable row level security;
revoke all on public.hazeflow_records from anon, authenticated;
grant select on public.hazeflow_records to authenticated;
create policy "Read own Haze Flow records" on public.hazeflow_records
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.hazeflow_apply(p_space text, p_changes jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  change jsonb;
  current_row public.hazeflow_records%rowtype;
  conflicts jsonb := '[]'::jsonb;
  saved jsonb := '[]'::jsonb;
  k text;
  expected bigint;
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_space is null or p_changes is null or p_space not in ('main','sandbox') or jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) > 1000 then raise exception 'Invalid sync request'; end if;
  if (select count(*) <> count(distinct c->>'item_key') from jsonb_array_elements(p_changes) c) then raise exception 'Duplicate record keys'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text || ':' || p_space, 0));
  for change in select * from jsonb_array_elements(p_changes) loop
    k := change->>'item_key'; expected := (change->>'base_version')::bigint;
    if k is null or length(k) > 600 or expected is null or expected < 0 or jsonb_typeof(change->'deleted') <> 'boolean' or change->>'mutation_id' is null or octet_length(change::text) > 2000000 then raise exception 'Invalid change'; end if;
    select * into current_row from public.hazeflow_records where user_id=caller and space=p_space and item_key=k;
    if current_row.mutation_id = (change->>'mutation_id')::uuid then
      if current_row.deleted <> (change->>'deleted')::boolean or current_row.payload is distinct from change->'payload' then raise exception 'Mutation mismatch'; end if;
    elsif coalesce(current_row.version,0) <> expected then
      conflicts := conflicts || jsonb_build_array(jsonb_build_object('item_key',k));
    end if;
  end loop;
  if jsonb_array_length(conflicts) > 0 then return jsonb_build_object('applied',false,'conflicts',conflicts,'rows','[]'::jsonb); end if;
  for change in select * from jsonb_array_elements(p_changes) loop
    k := change->>'item_key';
    insert into public.hazeflow_records as r(user_id,space,item_key,payload,deleted,version,mutation_id)
    values(caller,p_space,k,change->'payload',(change->>'deleted')::boolean,1,(change->>'mutation_id')::uuid)
    on conflict(user_id,space,item_key) do update
      set payload=excluded.payload,deleted=excluded.deleted,version=r.version+1,mutation_id=excluded.mutation_id,updated_at=now()
      where r.mutation_id <> excluded.mutation_id;
    select * into current_row from public.hazeflow_records where user_id=caller and space=p_space and item_key=k;
    saved := saved || jsonb_build_array(jsonb_build_object('item_key',k,'payload',current_row.payload,'deleted',current_row.deleted,'version',current_row.version,'mutation_id',current_row.mutation_id));
  end loop;
  return jsonb_build_object('applied',true,'rows',saved);
end;
$$;
revoke all on function public.hazeflow_apply(text,jsonb) from public, anon;
grant execute on function public.hazeflow_apply(text,jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hazeflow-photos','hazeflow-photos',false,3145728,array['image/jpeg'])
on conflict(id) do nothing;
create policy "Read own Haze Flow photos" on storage.objects for select to authenticated
using (bucket_id='hazeflow-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Upload own Haze Flow photos" on storage.objects for insert to authenticated
with check (bucket_id='hazeflow-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Objects are immutable and retained for undo. No public bucket, anonymous reads, or cross-account writes.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='hazeflow_records') then
    alter publication supabase_realtime add table public.hazeflow_records;
  end if;
end $$;
