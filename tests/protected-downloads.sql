\set ON_ERROR_STOP on
-- Disposable fixture database only, after both authorization migrations.
begin;
update public.installers set is_published = false where is_published;
insert into storage.objects(bucket_id,name) values
  ('installers','android/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/demo.apk');
insert into public.installers(id,platform,version,architecture,file_name,size_bytes,source,storage_path,is_published)
  values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','android','2.0.0','ARM64','demo.apk',1000,'storage',
    'android/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/demo.apk',true);
insert into private.administrators(user_id) values ('11111111-1111-4111-8111-111111111111') on conflict do nothing;
update auth.users set email = 'verified@example.com', email_confirmed_at = now()
  where id = '22222222-2222-4222-8222-222222222222';
insert into public.demo_requests(id,name,email,interest,consent) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','Download test','Verified@Example.com','Monitoreo del suelo',true);

set local role anon;
do $$ begin
  begin perform public.can_download_demo(); raise exception 'Anonymous permission check allowed'; exception when insufficient_privilege then null; end;
  if (select count(*) from public.installers) <> 0 then raise exception 'Anonymous installer metadata leaked'; end if;
  if (select count(*) from storage.objects) <> 0 then raise exception 'Anonymous file leaked'; end if;
end $$;
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $$ begin
  if public.can_download_demo() then raise exception 'Unapproved visitor allowed'; end if;
  if (select count(*) from public.installers) <> 0 then raise exception 'Unapproved installer metadata leaked'; end if;
end $$;
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.authorize_demo('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
do $$ begin
  if not public.can_download_demo() then raise exception 'Admin download denied'; end if;
  begin
    update public.installers set is_published = true where id = '00000000-0000-4000-8000-000000000001';
    raise exception 'External publication bypass allowed';
  exception when check_violation then null; end;
end $$;
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $$ begin
  if not public.can_download_demo() then raise exception 'Verified approved visitor denied'; end if;
  if (select count(*) from public.installers where is_published) <> 1 then raise exception 'Approved published metadata missing'; end if;
  if (select count(*) from public.installers where not is_published) <> 0 then raise exception 'Draft metadata leaked'; end if;
  if (select count(*) from storage.objects) <> 0 then raise exception 'Approved visitor has direct storage access'; end if;
  if (select count(*) from public.demo_requests) <> 0 then raise exception 'Other personal data leaked'; end if;
  begin perform public.authorize_demo('dddddddd-dddd-4ddd-8ddd-dddddddddddd'); raise exception 'Visitor approved own request'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update auth.users set email_confirmed_at = null where id = '22222222-2222-4222-8222-222222222222';
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $$ begin
  if public.can_download_demo() then raise exception 'Unverified email allowed'; end if;
end $$;
reset role;
update auth.users set email = 'someone-else@example.com', email_confirmed_at = now()
  where id = '22222222-2222-4222-8222-222222222222';
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
set local request.jwt.claim.email = 'Verified@Example.com';
do $$ begin
  if public.can_download_demo() then raise exception 'Claim email bypassed Auth email'; end if;
end $$;
reset role;
update auth.users set email = 'verified@example.com' where id = '22222222-2222-4222-8222-222222222222';
update private.demo_authorizations set approved_at = now() - interval '2 days', expires_at = now() - interval '1 day'
  where request_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $$ begin
  if public.can_download_demo() then raise exception 'Expired approval allowed'; end if;
end $$;
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.authorize_demo('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
select public.revoke_demo_authorization('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $$ begin
  if public.can_download_demo() then raise exception 'Revoked approval allowed'; end if;
  if (select count(*) from public.installers) <> 0 then raise exception 'Revoked visitor retains metadata'; end if;
end $$;
reset role;
rollback;
select 'PASS: verified identity, approval, expiry, revocation, private installers and admin downloads' as result;
