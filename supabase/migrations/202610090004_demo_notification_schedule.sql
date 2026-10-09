begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
-- Configure demo_notification_url and demo_notification_secret in Supabase Vault.
create function private.dispatch_demo_notifications() returns void
language plpgsql security definer set search_path='' as $$
declare endpoint text; worker_secret text;
begin
  if not exists(select 1 from private.demo_email_jobs where next_attempt_at<=now() and attempts<48) then return; end if;
  select decrypted_secret into endpoint from vault.decrypted_secrets where name='demo_notification_url';
  select decrypted_secret into worker_secret from vault.decrypted_secrets where name='demo_notification_secret';
  if endpoint is null or worker_secret is null then return; end if;
  perform net.http_post(url:=endpoint,
    headers:=jsonb_build_object('Content-Type','application/json','x-demo-notification-secret',worker_secret),
    body:='{}'::jsonb,timeout_milliseconds:=60000);
end; $$;
revoke all on function private.dispatch_demo_notifications() from public, anon, authenticated;
select cron.schedule('agrifos-demo-email-retries','*/10 * * * *','select private.dispatch_demo_notifications()');
commit;
