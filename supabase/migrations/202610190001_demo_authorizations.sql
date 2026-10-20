begin;

-- Phase 1 records administrative approval; download enforcement follows separately.
create table private.demo_authorizations (
  request_id uuid primary key references public.demo_requests(id),
  approved_at timestamptz not null,
  approved_by uuid not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid,
  check (expires_at is null or expires_at > approved_at),
  check ((revoked_at is null) = (revoked_by is null))
);
-- Actor UUIDs deliberately survive deletion of an Auth account.
create table private.demo_authorization_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.demo_requests(id),
  action text not null check (action in ('authorized', 'revoked')),
  actor_id uuid not null,
  occurred_at timestamptz not null,
  expires_at timestamptz
);
create index demo_authorization_events_request
  on private.demo_authorization_events(request_id, id desc);
alter table private.demo_authorizations enable row level security;
alter table private.demo_authorization_events enable row level security;
revoke all on private.demo_authorizations, private.demo_authorization_events
  from public, anon, authenticated;

create function private.demo_authorization_status(p_request_id uuid) returns text
language sql stable set search_path = '' as $$
  select coalesce((select case
    when revoked_at is not null then 'revoked'
    when expires_at is not null and expires_at <= statement_timestamp() then 'expired'
    else 'authorized' end
    from private.demo_authorizations where request_id = p_request_id), 'pending');
$$;
revoke all on function private.demo_authorization_status(uuid) from public, anon, authenticated;

create function public.get_demo_authorization(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if not exists (select 1 from public.demo_requests where id = p_request_id) then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'status', private.demo_authorization_status(p_request_id),
    'authorization', (select to_jsonb(a) from private.demo_authorizations a where request_id = p_request_id),
    'history', coalesce((select jsonb_agg(to_jsonb(e) order by e.id desc)
      from private.demo_authorization_events e where request_id = p_request_id), '[]'::jsonb)
  );
end; $$;

create function public.authorize_demo(p_request_id uuid, p_expires_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); action_time timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  -- Serialize all approval/revocation operations for the same request.
  perform 1 from public.demo_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found' using errcode = 'P0002'; end if;
  action_time := clock_timestamp();
  if p_expires_at is not null and (not isfinite(p_expires_at) or p_expires_at <= action_time) then
    raise exception 'Expiration must be a future finite date' using errcode = '22023';
  end if;
  insert into private.demo_authorizations(request_id, approved_at, approved_by, expires_at)
  values (p_request_id, action_time, actor, p_expires_at)
  on conflict (request_id) do update set
    approved_at = excluded.approved_at, approved_by = excluded.approved_by,
    expires_at = excluded.expires_at, revoked_at = null, revoked_by = null;
  insert into private.demo_authorization_events(request_id, action, actor_id, occurred_at, expires_at)
  values (p_request_id, 'authorized', actor, action_time, p_expires_at);
  return public.get_demo_authorization(p_request_id);
end; $$;

create function public.revoke_demo_authorization(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare action_time timestamptz; current_expiry timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  perform 1 from public.demo_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found' using errcode = 'P0002'; end if;
  action_time := clock_timestamp();
  update private.demo_authorizations set revoked_at = action_time, revoked_by = auth.uid()
    where request_id = p_request_id and revoked_at is null returning expires_at into current_expiry;
  if not found then
    raise exception 'No authorization to revoke' using errcode = '22023';
  end if;
  insert into private.demo_authorization_events(request_id, action, actor_id, occurred_at, expires_at)
  values (p_request_id, 'revoked', auth.uid(), action_time, current_expiry);
  return public.get_demo_authorization(p_request_id);
end; $$;

revoke all on function public.get_demo_authorization(uuid),
  public.authorize_demo(uuid,timestamptz), public.revoke_demo_authorization(uuid) from public, anon, authenticated;
grant execute on function public.get_demo_authorization(uuid),
  public.authorize_demo(uuid,timestamptz), public.revoke_demo_authorization(uuid) to authenticated;

-- Preserve existing search and pagination, adding approval data for each row.
create or replace function public.list_demo_requests(p_search text default '', p_status text default '', p_page integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Access denied' using errcode = '42501'; end if;
  if length(p_search) > 200 or p_page < 0 or p_page > 100000 then raise exception 'Invalid filter'; end if;
  if p_status not in ('', 'new', 'contacted', 'scheduled', 'completed', 'archived') then raise exception 'Invalid status'; end if;
  with filtered as (
    select * from public.demo_requests
    where (p_status = '' or status = p_status)
      and (p_search = '' or position(lower(p_search) in lower(name || ' ' || email || ' ' || organization)) > 0)
  ), page_rows as (select * from filtered order by created_at desc, id limit 25 offset p_page * 25)
  select jsonb_build_object('total', (select count(*) from filtered),
    'items', coalesce((select jsonb_agg(to_jsonb(r) || jsonb_build_object(
      'authorization', (select to_jsonb(a) from private.demo_authorizations a where a.request_id = r.id)
    ) order by r.created_at desc, r.id) from page_rows r), '[]'::jsonb)) into result;
  return result;
end; $$;
commit;
