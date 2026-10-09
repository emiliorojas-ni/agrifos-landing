\set ON_ERROR_STOP on
begin;
set role authenticated;
do $$ begin
  begin perform public.consume_demo_quota(repeat('a',64),repeat('b',64)); raise exception 'Client quota mutation allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set role service_role;
do $$ begin
  for i in 1..3 loop
    if not public.consume_demo_quota(repeat('a',64),repeat('b',64)) then raise exception 'Valid request blocked'; end if;
  end loop;
  if public.consume_demo_quota(repeat('a',64),repeat('c',64)) then raise exception 'IP quota bypassed'; end if;
  if public.consume_demo_quota(repeat('d',64),repeat('b',64)) then raise exception 'Email quota bypassed'; end if;
end $$;
reset role;
update private.demo_rate_limits set count=100 where key='global';
set role service_role;
do $$ begin
  if public.consume_demo_quota(repeat('e',64),repeat('f',64)) then raise exception 'Global quota bypassed'; end if;
end $$;
rollback;
select 'PASS: atomic IP, email and global quotas, service-only access' as result;
