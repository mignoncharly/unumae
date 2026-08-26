#!/usr/bin/env node
/**
 * Gives the scheduled jobs the credentials they need.
 *
 *   npm run db:settings
 *
 * pg_cron runs SQL and Edge Functions speak HTTP, so `invoke_function` bridges
 * the two with pg_net — and to authenticate as itself it needs the project's
 * functions URL and a service role key. Neither can live in a migration,
 * because migrations are committed and a service role key must never be.
 *
 * They live encrypted in Supabase Vault. This script accepts them only from a
 * protected GitHub Environment and writes them through a service-role-only RPC,
 * printing neither secret value.
 *
 * Re-runnable. Run it again after rotating the key.
 */

if (!process.env.CI || process.env.GITHUB_ACTIONS !== 'true') {
  console.error('Hosted scheduler configuration is CI-only after Phase 10.');
  process.exit(1);
}
const projectUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!projectUrl || !serviceKey) {
  console.error(
    'Protected environment needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
  );
  process.exit(1);
}

const base = projectUrl.replace(/\/$/, '');
const functionsUrl = `${base}/functions/v1`;

for (const [secretName, secretValue] of [
  ['functions_url', functionsUrl],
  ['service_role_key', serviceKey],
]) {
  const response = await fetch(`${base}/rest/v1/rpc/configure_job_secret`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      secret_name: secretName,
      secret_value: secretValue,
    }),
  });
  if (!response.ok) {
    const text = (await response.text()).split(serviceKey).join('<redacted>');
    console.error(`HTTP ${response.status} ${text}`);
    process.exit(1);
  }
}

console.log(`functions_url    = ${functionsUrl}`);
console.log('service_role_key = <not printed>');
console.log('\nStored encrypted in Supabase Vault.');
