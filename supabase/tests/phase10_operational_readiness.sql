begin;
select plan(7);

select is(to_regclass('public.job_secrets'), null,
  'scheduler credentials are not stored in a public table');
select ok(to_regclass('vault.secrets') is not null,
  'Supabase Vault is installed for scheduler credentials');
select is(has_function_privilege('authenticated',
  'public.configure_job_secret(text,text)', 'EXECUTE'), false,
  'authenticated users cannot configure scheduler credentials');
select is(has_function_privilege('anon',
  'public.configure_job_secret(text,text)', 'EXECUTE'), false,
  'anonymous users cannot configure scheduler credentials');
select is(has_function_privilege('service_role',
  'public.configure_job_secret(text,text)', 'EXECUTE'), true,
  'service role is the explicit scheduler-secret writer');
select lives_ok(
  $$select public.configure_job_secret('functions_url', 'http://example.test/functions/v1')$$,
  'service configuration can write the allowlisted endpoint to Vault');
select throws_ok(
  $$select public.configure_job_secret('unexpected', 'value')$$,
  'P0001', 'Unsupported scheduled-job secret name',
  'unrecognized scheduler-secret names are refused');

select * from finish();
rollback;
