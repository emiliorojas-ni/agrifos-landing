\set ON_ERROR_STOP on
-- Disposable fixture database only. Apply migrations 001 and 202610190001 first.
begin;
insert into private.administrators(user_id) values ('11111111-1111-4111-8111-111111111111') on conflict do nothing;
insert into public.demo_requests(id,name,email,interest,consent) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Approval test','approval@example.com','Monitoreo del suelo',true),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Pending test','pending@example.com','Monitoreo del suelo',true);

set local role anon;
do $$ begin
  begin perform public.get_demo_authorization('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'); raise exception 'Anonymous read allowed'; exception when insufficient_privilege then null; end;
  begin perform public.authorize_demo('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'); raise exception 'Anonymous approval allowed'; exception when insufficient_privilege then null; end;
  begin perform public.revoke_demo_authorization('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'); raise exception 'Anonymous revocation allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $$ begin
  begin perform public.get_demo_authorization('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'); raise exception 'Unauthorized read allowed'; exception when insufficient_privilege then null; end;
  begin perform public.authorize_demo('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'); raise exception 'Unauthorized approval allowed'; exception when insufficient_privilege then null; end;
  begin perform public.revoke_demo_authorization('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'); raise exception 'Unauthorized revocation allowed'; exception when insufficient_privilege then null; end;
  begin perform count(*) from private.demo_authorizations; raise exception 'Direct read allowed'; exception when insufficient_privilege then null; end;
  begin delete from private.demo_authorization_events; raise exception 'History deletion allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $$ declare result jsonb; value timestamptz; begin
  result := public.get_demo_authorization('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  if result->>'status' <> 'pending' or result->'authorization' <> 'null'::jsonb or jsonb_array_length(result->'history') <> 0 then raise exception 'Existing request not pending'; end if;
  foreach value in array array[statement_timestamp() - interval '1 hour', '-infinity'::timestamptz, 'infinity'::timestamptz] loop
    begin perform public.authorize_demo('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', value); raise exception 'Invalid expiration allowed'; exception when invalid_parameter_value then null; end;
  end loop;
  begin perform public.authorize_demo('cccccccc-cccc-4ccc-8ccc-cccccccccccc'); raise exception 'Missing request approved'; exception when no_data_found then null; end;
  result := public.authorize_demo('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  if result->>'status' <> 'authorized' or result#>>'{authorization,approved_by}' <> '11111111-1111-4111-8111-111111111111' or result#>'{authorization,expires_at}' <> 'null'::jsonb then raise exception 'Approval failed'; end if;
  if jsonb_array_length(result->'history') <> 1 then raise exception 'Approval history missing'; end if;
  if (select status from public.demo_requests where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 'new' then raise exception 'Approval changed commercial status'; end if;
  result := public.authorize_demo('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', statement_timestamp() + interval '1 day');
  if result#>>'{authorization,expires_at}' is null or jsonb_array_length(result->'history') <> 2 then raise exception 'Renewal failed'; end if;
  result := public.revoke_demo_authorization('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  if result->>'status' <> 'revoked' or result#>>'{authorization,revoked_by}' <> '11111111-1111-4111-8111-111111111111' or jsonb_array_length(result->'history') <> 3 then raise exception 'Revocation failed'; end if;
  begin perform public.revoke_demo_authorization('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'); raise exception 'Double revoke allowed'; exception when invalid_parameter_value then null; end;
  result := public.authorize_demo('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  if result->>'status' <> 'authorized' or result#>'{authorization,revoked_at}' <> 'null'::jsonb or jsonb_array_length(result->'history') <> 4 then raise exception 'Reapproval lost history'; end if;
  update public.demo_requests set status = 'scheduled' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  if public.get_demo_authorization('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')->>'status' <> 'pending' then raise exception 'Scheduling approved a request'; end if;
  result := public.list_demo_requests('approval@example.com');
  if (result->>'total')::integer <> 1 or result#>>'{items,0,authorization,approved_by}' is null then raise exception 'List approval missing'; end if;
  begin update private.demo_authorizations set revoked_at = null; raise exception 'Direct admin write allowed'; exception when insufficient_privilege then null; end;
  begin delete from private.demo_authorization_events; raise exception 'Admin deleted history'; exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Simulate passage of time without waiting; only the fixture owner can do this.
update private.demo_authorizations set approved_at = statement_timestamp() - interval '2 days',
  expires_at = statement_timestamp() - interval '1 day' where request_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $$ declare result jsonb; begin
  result := public.get_demo_authorization('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  if result->>'status' <> 'expired' or jsonb_array_length(result->'history') <> 4 then raise exception 'Expiration state/history incorrect'; end if;
end $$;
reset role;
rollback;
select 'PASS: approval permissions, expiry, revocation, renewal, audit history and independent commercial status' as result;
