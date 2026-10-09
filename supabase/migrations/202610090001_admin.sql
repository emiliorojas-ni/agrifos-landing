begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.administrators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from private.administrators where user_id = (select auth.uid())); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

create table public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  email text not null check (length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  organization text not null default '' check (length(organization) <= 160),
  phone text not null default '' check (length(phone) <= 40),
  interest text not null check (interest in ('Monitoreo del suelo', 'Seguimiento del cultivo', 'Recomendaciones para tomar decisiones')),
  message text not null default '' check (length(message) <= 1500),
  consent boolean not null check (consent = true),
  status text not null default 'new' check (status in ('new', 'contacted', 'scheduled', 'completed', 'archived')),
  notes text not null default '' check (length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index demo_requests_created on public.demo_requests(created_at desc);
create index demo_requests_status on public.demo_requests(status);
alter table public.demo_requests enable row level security;
revoke all on public.demo_requests from anon, authenticated;
grant select on public.demo_requests to authenticated;
grant update(status, notes) on public.demo_requests to authenticated;
grant all on public.demo_requests to service_role;
create policy admin_read_requests on public.demo_requests for select to authenticated using ((select public.is_admin()));
create policy admin_update_requests on public.demo_requests for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create function private.touch_request() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger touch_request before update on public.demo_requests for each row execute function private.touch_request();

create function public.list_demo_requests(p_search text default '', p_status text default '', p_page integer default 0)
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
    'items', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc, r.id) from page_rows r), '[]'::jsonb)) into result;
  return result;
end; $$;
revoke all on function public.list_demo_requests(text,text,integer) from public;
grant execute on function public.list_demo_requests(text,text,integer) to authenticated;

create table public.installers (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform = 'android'),
  version text not null check (length(version) <= 64 and version ~ '^\d+\.\d+\.\d+([-+][a-zA-Z0-9.-]+)?$'),
  architecture text not null check (architecture in ('ARM64', 'ARM32', 'Universal')),
  file_name text not null check (length(file_name) between 1 and 255),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  source text not null check (source in ('github', 'storage')),
  storage_path text unique,
  external_url text,
  is_published boolean not null default false,
  uploaded_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (lower(file_name) like '%.apk'),
  check ((source = 'github' and storage_path is null and external_url is not null and external_url ~ '^https://github\.com/ferjovel06/agrifos/releases/download/[^/]+/[^/?#]+$')
    or (source = 'storage' and external_url is null and storage_path is not null and storage_path ~ '^android/[0-9a-f-]{36}/[a-z0-9._-]+\.apk$'))
);
create unique index one_published_installer on public.installers(platform) where is_published;
alter table public.installers enable row level security;
revoke all on public.installers from anon, authenticated;
grant select on public.installers to anon, authenticated;
grant insert on public.installers to authenticated;
grant update(is_published) on public.installers to authenticated;
grant all on public.installers to service_role;
create policy public_published_installers on public.installers for select to anon, authenticated using (is_published);
create policy admin_all_installers on public.installers for select to authenticated using ((select public.is_admin()));
create policy admin_insert_installers on public.installers for insert to authenticated with check ((select public.is_admin()) and source = 'storage' and not is_published and uploaded_by = auth.uid());
create policy admin_update_installers on public.installers for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('installers','installers',false,52428800,array['application/octet-stream']);
create policy admin_read_installer_files on storage.objects for select to authenticated using (bucket_id = 'installers' and (select public.is_admin()));
create policy admin_upload_installer_files on storage.objects for insert to authenticated with check (
  bucket_id = 'installers' and (select public.is_admin()) and
  name ~ '^android/[0-9a-f-]{36}/[a-z0-9._-]+\.apk$'
);
create policy admin_delete_installer_files on storage.objects for delete to authenticated using (bucket_id = 'installers' and (select public.is_admin()));

create function public.publish_installer(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare target public.installers;
begin
  if not public.is_admin() then raise exception 'Access denied' using errcode = '42501'; end if;
  select * into target from public.installers where id = p_id;
  if not found then raise exception 'Installer not found'; end if;
  perform pg_advisory_xact_lock(hashtext('installer:' || target.platform));
  if target.source = 'storage' and not exists(select 1 from storage.objects where bucket_id = 'installers' and name = target.storage_path) then raise exception 'File not found'; end if;
  update public.installers set is_published = false where platform = target.platform and is_published;
  update public.installers set is_published = true where id = p_id;
end; $$;
revoke all on function public.publish_installer(uuid) from public;
grant execute on function public.publish_installer(uuid) to authenticated;

insert into public.installers(id,platform,version,architecture,file_name,size_bytes,source,external_url,is_published)
values ('00000000-0000-4000-8000-000000000001','android','1.0.0','ARM64','agrifos-v1.0.0-android-arm64.apk',22600581,'github',
  'https://github.com/ferjovel06/agrifos/releases/download/v1.0.0/agrifos-v1.0.0-android-arm64.apk',true);
commit;
