begin;

create index demo_requests_normalized_email on public.demo_requests(lower(trim(email)));

-- A published external URL would bypass authorization after it has been copied.
-- Existing Storage publications remain active; legacy GitHub entries become drafts.
update public.installers set is_published = false where source <> 'storage' and is_published;
alter table public.installers add constraint published_installers_use_private_storage
  check (not is_published or source = 'storage');

-- Read the Auth record, never an email supplied by the browser or user metadata.
-- Any unrevoked, unexpired approval for the verified email grants access.
create function public.can_download_demo() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from auth.users u
    join public.demo_requests r on lower(trim(r.email)) = lower(trim(u.email))
    join private.demo_authorizations a on a.request_id = r.id
    where u.id = auth.uid() and u.email_confirmed_at is not null
      and a.revoked_at is null
      and (a.expires_at is null or a.expires_at > statement_timestamp())
  );
$$;
revoke all on function public.can_download_demo() from public, anon, authenticated;
grant execute on function public.can_download_demo() to authenticated;

drop policy public_published_installers on public.installers;
create policy authorized_published_installers on public.installers for select to authenticated
  using (is_published and (select public.can_download_demo()));
-- Anonymous SELECT returns no rows. Storage stays private and admin-only.
commit;
