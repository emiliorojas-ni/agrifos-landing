begin;
alter table public.demo_requests add column notification_status text not null default 'not_requested'
  check (notification_status in ('not_requested','pending','sent','activation_required','failed'));
alter table public.demo_requests alter column notification_status set default 'pending';
alter table public.demo_requests add column notification_sent_at timestamptz;
create table private.demo_email_jobs (
  request_id uuid primary key references public.demo_requests(id) on delete cascade,
  attempts integer not null default 0,
  next_attempt_at timestamptz default now()
);
revoke all on private.demo_email_jobs from public, anon, authenticated;
create function private.queue_demo_email() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into private.demo_email_jobs(request_id) values(new.id);
  return new;
end; $$;
revoke all on function private.queue_demo_email() from public, anon, authenticated;
create trigger queue_demo_email after insert on public.demo_requests
  for each row execute function private.queue_demo_email();

create function public.claim_demo_email_jobs(p_id uuid default null) returns setof jsonb
language sql security definer set search_path='' as $$
  with due as (
    select request_id from private.demo_email_jobs
    where next_attempt_at <= now() and attempts < 48 and (p_id is null or request_id=p_id)
    order by next_attempt_at limit 5 for update skip locked
  ), claimed as (
    update private.demo_email_jobs j set attempts=attempts+1,next_attempt_at=now()+interval '5 minutes'
    from due where j.request_id=due.request_id returning j.request_id,j.attempts
  ) select to_jsonb(r) || jsonb_build_object('attempt',c.attempts)
    from claimed c join public.demo_requests r on r.id=c.request_id;
$$;
revoke all on function public.claim_demo_email_jobs(uuid) from public, anon, authenticated;
grant execute on function public.claim_demo_email_jobs(uuid) to service_role;

create function public.finish_demo_email_job(p_id uuid,p_attempt integer,p_status text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if p_status not in ('sent','activation_required','failed') or p_status is null then raise exception 'Invalid notification status'; end if;
  update private.demo_email_jobs set next_attempt_at=case
    when p_status='sent' or attempts>=48 then null
    else now()+interval '10 minutes'*least(6,attempts) end
    where request_id=p_id and attempts=p_attempt;
  if found then
    update public.demo_requests set notification_status=p_status,
      notification_sent_at=case when p_status='sent' then now() else null end where id=p_id;
  end if;
end; $$;
revoke all on function public.finish_demo_email_job(uuid,integer,text) from public, anon, authenticated;
grant execute on function public.finish_demo_email_job(uuid,integer,text) to service_role;
commit;
