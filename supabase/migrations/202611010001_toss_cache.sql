-- A restricted publisher can update only the owner's broker snapshot.
create schema if not exists hazeflow_private;
revoke all on schema hazeflow_private from public, anon, authenticated;
create table if not exists hazeflow_private.toss_publishers (
 user_id uuid primary key references auth.users(id) on delete cascade,
 token_hash bytea not null,
 created_at timestamptz not null default now()
);
revoke all on hazeflow_private.toss_publishers from public, anon, authenticated;
alter table hazeflow_private.toss_publishers enable row level security;
create table if not exists public.hazeflow_toss_cache (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb,
 fetched_at timestamptz,
 attempted_at timestamptz not null,
 last_error text,
 updated_at timestamptz not null default now()
);
alter table public.hazeflow_toss_cache enable row level security;
revoke all on public.hazeflow_toss_cache from public, anon, authenticated;
grant select on public.hazeflow_toss_cache to authenticated;
do $$ begin if not exists(select 1 from pg_catalog.pg_policies where schemaname='public' and tablename='hazeflow_toss_cache' and policyname='toss_cache_owner_read') then create policy toss_cache_owner_read on public.hazeflow_toss_cache for select to authenticated using(auth.uid()=user_id); end if; end $$;
create table if not exists public.hazeflow_toss_daily (
 user_id uuid references auth.users(id) on delete cascade,
 day date not null,
 total bigint not null check(total>=0),
 fetched_at timestamptz not null,
 primary key(user_id,day)
);
alter table public.hazeflow_toss_daily enable row level security;
revoke all on public.hazeflow_toss_daily from public,anon,authenticated;
grant select on public.hazeflow_toss_daily to authenticated;
do $$ begin if not exists(select 1 from pg_catalog.pg_policies where schemaname='public' and tablename='hazeflow_toss_daily' and policyname='toss_daily_owner_read') then create policy toss_daily_owner_read on public.hazeflow_toss_daily for select to authenticated using(auth.uid()=user_id); end if; end $$;
create or replace function public.hazeflow_publish_toss(p_owner_id uuid,p_key text,p_payload jsonb,p_attempted_at timestamptz,p_error text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare expected bytea; total numeric:=0; quote_time timestamptz;
begin
 if p_key is null or length(p_key)<>64 then raise exception 'Publisher authentication failed'; end if;
 select token_hash into expected from hazeflow_private.toss_publishers where user_id=p_owner_id;
 if expected is null or expected<>sha256(convert_to(p_key,'UTF8')) then raise exception 'Publisher authentication failed'; end if;
 if p_attempted_at is null or abs(extract(epoch from (clock_timestamp()-p_attempted_at)))>300 then raise exception 'Publisher timestamp invalid'; end if;
 if p_error is not null and (length(p_error)>500 or p_payload is not null) then raise exception 'Publisher error invalid'; end if;
 if p_payload is not null then
  if octet_length(p_payload::text)>4096 or jsonb_typeof(p_payload) is distinct from 'object' or jsonb_typeof(p_payload->'total') is distinct from 'number' or jsonb_typeof(p_payload->'fetchedAt') is distinct from 'string' or (p_payload-array['total','fetchedAt'])<>'{}'::jsonb then raise exception 'Daily portfolio invalid'; end if;
  quote_time:=(p_payload->>'fetchedAt')::timestamptz;
  if abs(extract(epoch from (p_attempted_at-quote_time)))>300 then raise exception 'Portfolio timestamp invalid'; end if;
  total:=(p_payload->>'total')::numeric;
  if total<0 or total>9007199254740991 or mod(total,1)<>0 then raise exception 'Portfolio total invalid'; end if;
 elsif p_error is null then raise exception 'Portfolio missing'; end if;
 insert into public.hazeflow_toss_cache(user_id,payload,fetched_at,attempted_at,last_error)
 values(p_owner_id,p_payload,quote_time,p_attempted_at,p_error)
 on conflict(user_id) do update set
 payload=coalesce(excluded.payload,hazeflow_toss_cache.payload),
 fetched_at=coalesce(excluded.fetched_at,hazeflow_toss_cache.fetched_at),
 attempted_at=excluded.attempted_at,last_error=excluded.last_error,updated_at=now()
 where excluded.attempted_at>hazeflow_toss_cache.attempted_at and (excluded.fetched_at is null or hazeflow_toss_cache.fetched_at is null or excluded.fetched_at>=hazeflow_toss_cache.fetched_at);
 if p_payload is not null then
  insert into public.hazeflow_toss_daily(user_id,day,total,fetched_at) values(p_owner_id,(quote_time at time zone 'Asia/Seoul')::date,total::bigint,quote_time)
  on conflict(user_id,day) do update set total=excluded.total,fetched_at=excluded.fetched_at where excluded.fetched_at>hazeflow_toss_daily.fetched_at;
 end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.hazeflow_publish_toss(uuid,text,jsonb,timestamptz,text) from public;
grant execute on function public.hazeflow_publish_toss(uuid,text,jsonb,timestamptz,text) to anon,authenticated;
