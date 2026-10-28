begin;
-- Exercise the same service-role-only RPC as the signed webhook, then roll back.
select public.sync_clerk_member('user_SyncRegression','Pending account',1000,'user.created');
do $$ begin
  assert (select not active from public.app_members where clerk_subject='user_SyncRegression');
  update public.app_members set active=true where clerk_subject='user_SyncRegression';
  perform public.sync_clerk_member('user_SyncRegression','Updated profile',2000,'user.updated');
  perform public.sync_clerk_member('user_SyncRegression','Stale profile',1000,'user.created');
  assert (select active and display_name='Updated profile' from public.app_members where clerk_subject='user_SyncRegression');
  perform public.sync_clerk_member('user_SyncRegression','Deleted account',3000,'user.deleted');
  perform public.sync_clerk_member('user_SyncRegression','Late update',4000,'user.updated');
  assert (select not active and clerk_deleted and display_name='Updated profile' from public.app_members where clerk_subject='user_SyncRegression');
  assert not has_function_privilege('authenticated','public.sync_clerk_member(text,text,bigint,text)','execute');
  assert not has_function_privilege('anon','public.sync_clerk_member(text,text,bigint,text)','execute');
end $$;
rollback;
