alter table public.app_members
  add column email text check (email is null or length(email) between 3 and 320);

drop function public.sync_clerk_member(text,text,bigint,text);
create function public.sync_clerk_member(subject text,display_name text,email text,event_timestamp bigint,event_type text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if subject !~ '^user_[A-Za-z0-9]+$' or length(subject)>200 or event_timestamp<=0
    or event_type not in ('user.created','user.updated','user.deleted')
    or nullif(trim(display_name),'') is null or length(display_name)>100
    or (email is not null and (length(email) not between 3 and 320 or email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')) then
    raise check_violation using message='Invalid Clerk user event.';
  end if;
  insert into public.app_members(clerk_subject,display_name,email,role,active,clerk_updated_at,clerk_deleted)
  values(subject,trim(display_name),lower(email),'business_user',false,event_timestamp,event_type='user.deleted')
  on conflict(clerk_subject) do update set
    display_name=case when excluded.clerk_deleted then app_members.display_name else excluded.display_name end,
    email=case when excluded.clerk_deleted then app_members.email else excluded.email end,
    active=case when excluded.clerk_deleted then false else app_members.active end,
    clerk_updated_at=excluded.clerk_updated_at,
    clerk_deleted=app_members.clerk_deleted or excluded.clerk_deleted
  where (excluded.clerk_updated_at>app_members.clerk_updated_at
      or (excluded.clerk_updated_at=app_members.clerk_updated_at and excluded.clerk_deleted and not app_members.clerk_deleted))
    and not app_members.clerk_deleted;
end $$;
revoke all on function public.sync_clerk_member(text,text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.sync_clerk_member(text,text,text,bigint,text) to service_role;
