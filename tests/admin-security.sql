\set ON_ERROR_STOP on
insert into private.administrators(user_id) values ('11111111-1111-4111-8111-111111111111');
insert into public.demo_requests(name,email,interest,consent) values ('Persona de prueba','person@example.com','Monitoreo del suelo',true);

set role anon;
do $$ begin
  begin perform count(*) from public.demo_requests; raise exception 'Anonymous request read allowed'; exception when insufficient_privilege then null; end;
  begin perform public.is_admin(); raise exception 'Anonymous admin check allowed'; exception when insufficient_privilege then null; end;
  if (select count(*) from public.installers) <> 1 then raise exception 'Published APK missing'; end if;
  if (select count(*) from storage.objects) <> 0 then raise exception 'Anonymous storage read allowed'; end if;
end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $$ begin
  if public.is_admin() then raise exception 'Unauthorized account is admin'; end if;
  if (select count(*) from public.demo_requests) <> 0 then raise exception 'Unauthorized request read allowed'; end if;
  begin perform public.list_demo_requests(); raise exception 'Unauthorized search allowed'; exception when insufficient_privilege then null; end;
  begin perform public.publish_installer('00000000-0000-4000-8000-000000000001'); raise exception 'Unauthorized publish allowed'; exception when insufficient_privilege then null; end;
  begin insert into public.demo_requests(name,email,interest,consent) values ('Spam','s@example.com','Monitoreo del suelo',true); raise exception 'Direct public submission allowed'; exception when insufficient_privilege then null; end;
  begin insert into storage.objects(bucket_id,name) values ('installers','android/33333333-3333-4333-8333-333333333333/test.apk'); raise exception 'Unauthorized upload allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $$ begin
  if not public.is_admin() then raise exception 'Admin access denied'; end if;
  if (public.list_demo_requests()->>'total')::integer <> 1 then raise exception 'Admin search failed'; end if;
  update public.demo_requests set status = 'contacted',notes = 'Llamar para coordinar';
  if (select status from public.demo_requests limit 1) <> 'contacted' then raise exception 'Status update failed'; end if;
  begin update public.demo_requests set email = 'changed@example.com'; raise exception 'Contact data mutation allowed'; exception when insufficient_privilege then null; end;
  begin insert into storage.objects(bucket_id,name) values ('installers','android/33333333-3333-4333-8333-333333333333/test.exe'); raise exception 'Wrong platform extension allowed'; exception when insufficient_privilege then null; end;
  insert into storage.objects(bucket_id,name) values ('installers','android/33333333-3333-4333-8333-333333333333/test.apk');
  insert into public.installers(id,platform,version,architecture,file_name,size_bytes,source,storage_path)
  values ('33333333-3333-4333-8333-333333333333','android','1.1.0','ARM64','test.apk',1000,'storage','android/33333333-3333-4333-8333-333333333333/test.apk');
end $$;
reset role;

set role anon;
do $$ begin
  if (select count(*) from public.installers) <> 1 then raise exception 'Draft metadata leaked'; end if;
  if (select count(*) from storage.objects) <> 0 then raise exception 'Draft file leaked'; end if;
end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.publish_installer('33333333-3333-4333-8333-333333333333');
do $$ begin
  if (select count(*) from public.installers where platform = 'android' and is_published) <> 1 then raise exception 'More than one published installer'; end if;
  if (select is_published from public.installers where id = '00000000-0000-4000-8000-000000000001') then raise exception 'Previous publication still active'; end if;
end $$;
reset role;
set role anon;
do $$ begin
  if (select version from public.installers limit 1) <> '1.1.0' then raise exception 'Public download not updated'; end if;
  if (select count(*) from storage.objects) <> 0 then raise exception 'Storage objects became publicly readable'; end if;
end $$;
reset role;
select 'PASS: private access, request management, upload rules, draft protection, publication replacement' as result;
