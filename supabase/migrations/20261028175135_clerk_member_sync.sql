-- Clerk profile sync never grants workspace access. Only set_member can approve it.
alter table public.app_members
  add column clerk_updated_at bigint not null default 0,
  add column clerk_deleted boolean not null default false;

create function public.sync_clerk_member(subject text,display_name text,event_timestamp bigint,event_type text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if subject !~ '^user_[A-Za-z0-9]+$' or length(subject)>200 or event_timestamp<=0
    or event_type not in ('user.created','user.updated','user.deleted')
    or nullif(trim(display_name),'') is null or length(display_name)>100 then
    raise check_violation using message='Invalid Clerk user event.';
  end if;
  insert into public.app_members(clerk_subject,display_name,role,active,clerk_updated_at,clerk_deleted)
  values(subject,trim(display_name),'business_user',false,event_timestamp,event_type='user.deleted')
  on conflict(clerk_subject) do update set
    display_name=case when excluded.clerk_deleted then app_members.display_name else excluded.display_name end,
    active=case when excluded.clerk_deleted then false else app_members.active end,
    clerk_updated_at=excluded.clerk_updated_at,
    clerk_deleted=app_members.clerk_deleted or excluded.clerk_deleted
  where (excluded.clerk_updated_at>app_members.clerk_updated_at
      or (excluded.clerk_updated_at=app_members.clerk_updated_at and excluded.clerk_deleted and not app_members.clerk_deleted))
    and not app_members.clerk_deleted;
end $$;
revoke all on function public.sync_clerk_member(text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.sync_clerk_member(text,text,bigint,text) to service_role;

create or replace function public.set_member(subject text,display_name text,active boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor text:=app_private.require_actor(false); old public.app_members; saved public.app_members;
begin
  if not app_private.is_admin() then raise insufficient_privilege using message='Technical administrator access required.';end if;
  if subject=actor then raise check_violation using message='You cannot change your own administrator access here.';end if;
  if nullif(trim(display_name),'') is null or length(display_name)>100 or length(subject) not between 1 and 200 then raise check_violation using message='Enter a Clerk subject and a name.';end if;
  perform pg_advisory_xact_lock(428102026);
  select * into old from public.app_members where clerk_subject=subject;
  if active and old.clerk_deleted then raise check_violation using message='This Clerk account was deleted and cannot be approved.';end if;
  if old.role='technical_admin' then raise check_violation using message='Administrator accounts are managed through the trusted server console.';end if;
  if active and (old.clerk_subject is null or not old.active) and (select count(*) from public.app_members where role='business_user' and app_members.active)>=4 then raise check_violation using message='This workspace supports four active business users.';end if;
  insert into public.app_members(clerk_subject,display_name,role,active) values(subject,trim(display_name),'business_user',set_member.active)
    on conflict(clerk_subject) do update set display_name=excluded.display_name,active=excluded.active returning * into saved;
  insert into public.audit_events(actor,action,before_data,after_data,reason) values(actor,'membership_changed',to_jsonb(old),to_jsonb(saved),'Technical administrator changed workspace access');
  return to_jsonb(saved);
end $$;

