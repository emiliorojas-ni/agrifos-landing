-- Run only in the disposable fixture database after migrations 001-003.
begin;
insert into public.demo_requests(id,name,email,organization,phone,interest,message,consent)
values('55555555-5555-4555-8555-555555555555','Test','test@example.com','','','Monitoreo del suelo','',true);
do $$ begin
  if has_function_privilege('anon','public.claim_demo_email_jobs(uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.finish_demo_email_job(uuid,integer,text)','EXECUTE') then
    raise exception 'Browser can manipulate mail queue';
  end if;
  if has_column_privilege('authenticated','public.demo_requests','notification_status','UPDATE') then
    raise exception 'Browser can forge notification status';
  end if;
  if (select count(*) from public.claim_demo_email_jobs('55555555-5555-4555-8555-555555555555')) <> 1 then raise exception 'Job missing'; end if;
  if (select count(*) from public.claim_demo_email_jobs('55555555-5555-4555-8555-555555555555')) <> 0 then raise exception 'Lease duplicated'; end if;
end $$;
select public.finish_demo_email_job('55555555-5555-4555-8555-555555555555',1,'activation_required');
do $$ begin
  if not exists(select 1 from private.demo_email_jobs where next_attempt_at>now()) then raise exception 'Retry lost'; end if;
end $$;
update private.demo_email_jobs set next_attempt_at=now();
select count(*) from public.claim_demo_email_jobs('55555555-5555-4555-8555-555555555555');
select public.finish_demo_email_job('55555555-5555-4555-8555-555555555555',2,'sent');
do $$ begin
  if not exists(select 1 from public.demo_requests where notification_status='sent' and notification_sent_at is not null) then raise exception 'Success missing'; end if;
  if (select count(*) from public.claim_demo_email_jobs('55555555-5555-4555-8555-555555555555'))<>0 then raise exception 'Sent job retried'; end if;
end $$;
rollback;
