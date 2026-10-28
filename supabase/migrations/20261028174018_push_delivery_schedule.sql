-- The dispatch credential and project URL are provisioned separately in Vault.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'gaadihisaab-push-delivery',
  '* * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='gaadihisaab_project_url') || '/functions/v1/push-dispatch',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='gaadihisaab_push_dispatch_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
  where exists (
    select 1 from public.notifications n
    where n.push_state in ('pending','failed') and n.attempts<8 and n.next_attempt_at<=now()
      and exists(select 1 from public.push_subscriptions s join public.app_members m on m.clerk_subject=s.subject and m.active where s.subject=n.recipient)
  )
  and exists(select 1 from vault.secrets where name='gaadihisaab_project_url')
  and exists(select 1 from vault.secrets where name='gaadihisaab_push_dispatch_secret');
  $job$
);
