-- Phase 10: move scheduler credentials from an ordinary table to Vault.
create extension if not exists supabase_vault with schema vault;

do $$
declare configured record;
begin
  if to_regclass('public.job_secrets') is not null then
    for configured in execute
      'select key, value from public.job_secrets where key in '
      || '(''functions_url'', ''service_role_key'')'
    loop
      if not exists (
        select 1 from vault.secrets
        where name = 'unumae_' || configured.key
      ) then
        perform vault.create_secret(
          configured.value,
          'unumae_' || configured.key,
          'Unumae scheduled Edge dispatcher credential'
        );
      end if;
    end loop;
  end if;
end;
$$;

drop table if exists public.job_secrets;

create or replace function public.configure_job_secret(
  secret_name text,
  secret_value text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  vault_name text := 'unumae_' || secret_name;
  existing_id uuid;
begin
  if secret_name not in ('functions_url', 'service_role_key') then
    raise exception 'Unsupported scheduled-job secret name';
  end if;
  if secret_value is null or length(secret_value) < 1 then
    raise exception 'Scheduled-job secret value cannot be empty';
  end if;
  select id into existing_id from vault.secrets where name = vault_name;
  if existing_id is null then
    perform vault.create_secret(
      secret_value,
      vault_name,
      'Unumae scheduled Edge dispatcher credential'
    );
  else
    perform vault.update_secret(
      existing_id,
      secret_value,
      vault_name,
      'Unumae scheduled Edge dispatcher credential'
    );
  end if;
end;
$$;

revoke all on function public.configure_job_secret(text, text)
from public, anon, authenticated;
grant execute on function public.configure_job_secret(text, text) to service_role;

create or replace function public.invoke_function(function_name text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_url text;
  service_key text;
  net_request_id bigint;
  run_id bigint;
  worker_lease uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('worker:' || function_name));
  perform public.recover_worker_runs();
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    insert into public.job_runs (job, ok, status, detail, completed_at)
    values (function_name, false, 'failed', 'pg_net is not installed', now());
    return null;
  end if;
  select decrypted_secret into base_url
  from vault.decrypted_secrets where name = 'unumae_functions_url';
  select decrypted_secret into service_key
  from vault.decrypted_secrets where name = 'unumae_service_role_key';
  if base_url is null or service_key is null then
    insert into public.job_runs (job, ok, status, detail, completed_at)
    values (function_name, false, 'failed',
      'Worker endpoint credentials are not configured', now());
    return null;
  end if;
  select id into run_id from public.job_runs
  where job = function_name and status = 'queued'
    and next_attempt_at <= now()
  order by ran_at limit 1 for update skip locked;
  if run_id is null and exists (
    select 1 from public.job_runs where job = function_name
      and status in ('queued', 'leased')
  ) then return null; end if;
  if run_id is null then
    insert into public.job_runs (job, ok, status, detail)
    values (function_name, false, 'queued', 'Waiting for worker dispatch')
    returning id into run_id;
  end if;
  worker_lease := public.claim_worker_run(run_id, function_name, null);
  if worker_lease is null then return null; end if;
  select net.http_post(
    url := base_url || '/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object('jobRunId', run_id, 'leaseToken', worker_lease)
  ) into net_request_id;
  update public.job_runs set request_id = net_request_id,
    detail = 'Worker request queued' where id = run_id;
  return net_request_id;
exception when others then
  if run_id is not null and worker_lease is not null then
    perform public.complete_worker_run(
      run_id, worker_lease, false, true, 'Worker dispatch failed', 'network'
    );
  end if;
  return null;
end;
$$;

revoke execute on function public.invoke_function(text)
from public, anon, authenticated;

-- Bootstrap addresses are now supplied through controlled operator tooling.
truncate table public.founding_moderators;
