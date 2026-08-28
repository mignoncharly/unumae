\set ON_ERROR_STOP on

-- Restore rehearsal contract: the dump must contain the critical application
-- graph and the functions that operate it, not merely a reachable database.
do $$
declare
  missing_tables text;
  missing_functions text;
  orphan_count bigint;
begin
  select string_agg(name, ', ' order by name)
    into missing_tables
  from (values
    ('public.profiles'),
    ('public.daily_draws'),
    ('public.draw_candidates'),
    ('public.draw_invitations'),
    ('public.portraits'),
    ('public.portrait_elements'),
    ('public.questions'),
    ('public.remembers'),
    ('public.deletion_requests'),
    ('public.storage_cleanup_jobs'),
    ('public.job_runs'),
    ('public.notification_log'),
    ('public.notification_deliveries'),
    ('public.account_device_attestations'),
    ('public.installation_sessions'),
    ('storage.objects')
  ) required(name)
  where to_regclass(name) is null;

  if missing_tables is not null then
    raise exception 'Restored database is missing critical tables: %', missing_tables;
  end if;

  select string_agg(name, ', ' order by name)
    into missing_functions
  from (values
    ('export_my_data'),
    ('get_human'),
    ('get_archive_page'),
    ('refresh_selection_eligibility'),
    ('run_daily_draw_job'),
    ('publish_due_cycles_job'),
    ('claim_account_deletion_requests'),
    ('purge_phase6_operational_data'),
    ('invoke_notifications_if_due')
  ) required(name)
  where not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = name
  );

  if missing_functions is not null then
    raise exception 'Restored database is missing critical functions: %', missing_functions;
  end if;

  select count(*) into orphan_count
  from public.draw_candidates c
  left join public.daily_draws d on d.id = c.draw_id
  left join public.profiles p on p.id = c.user_id
  where d.id is null or p.id is null;
  if orphan_count <> 0 then
    raise exception 'Restored database has % orphaned draw-candidate rows', orphan_count;
  end if;

  select count(*) into orphan_count
  from public.portrait_elements e
  left join public.portraits p on p.id = e.portrait_id
  where p.id is null;
  if orphan_count <> 0 then
    raise exception 'Restored database has % orphaned portrait-element rows', orphan_count;
  end if;

  select count(*) into orphan_count
  from public.portraits p
  left join public.daily_draws d on d.id = p.draw_id
  where d.id is null;
  if orphan_count <> 0 then
    raise exception 'Restored database has % orphaned portrait rows', orphan_count;
  end if;

  -- Approved media must retain a corresponding private Storage object row.
  -- The byte-for-byte object check runs separately against the storage archive.
  select count(*) into orphan_count
  from public.portraits p
  left join storage.objects o
    on o.bucket_id = 'portraits' and o.name = p.photo_path
  where p.status = 'approved' and p.photo_path is not null and o.id is null;
  if orphan_count <> 0 then
    raise exception 'Restored database has % approved portraits without private media references', orphan_count;
  end if;
end;
$$;

select 'Restored database contract verified.' as result;
