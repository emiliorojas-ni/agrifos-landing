begin;
create table private.demo_rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);
revoke all on private.demo_rate_limits from public, anon, authenticated;

-- Called only by the Edge Function with the server key. Hashes contain no raw IP/email.
create function public.consume_demo_quota(p_ip_hash text, p_email_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  hour_start timestamptz := date_trunc('hour', now() at time zone 'UTC') at time zone 'UTC';
  day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
begin
  if p_ip_hash !~ '^[a-f0-9]{64}$' or p_email_hash !~ '^[a-f0-9]{64}$'
     or p_ip_hash is null or p_email_hash is null then raise exception 'Invalid quota key'; end if;
  perform pg_advisory_xact_lock(hashtext('landing-demo-quota'));
  delete from private.demo_rate_limits where window_start < now() - interval '2 days';
  if coalesce((select count from private.demo_rate_limits where key='global' and window_start=day_start),0) >= 100
    or coalesce((select count from private.demo_rate_limits where key='ip:'||p_ip_hash and window_start=hour_start),0) >= 3
    or coalesce((select count from private.demo_rate_limits where key='email:'||p_email_hash and window_start=hour_start),0) >= 3 then
    return false;
  end if;
  insert into private.demo_rate_limits(key,window_start,count)
    values ('global',day_start,1),('ip:'||p_ip_hash,hour_start,1),('email:'||p_email_hash,hour_start,1)
    on conflict (key,window_start) do update set count=private.demo_rate_limits.count+1;
  return true;
end; $$;
revoke all on function public.consume_demo_quota(text,text) from public, anon, authenticated;
grant execute on function public.consume_demo_quota(text,text) to service_role;
commit;
