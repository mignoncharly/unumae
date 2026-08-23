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
 * So they live in `public.job_secrets`, which has RLS on, no policy, and no
 * grants to any client role. This script reads them out of the local credential
 * file and writes them with the service role, printing neither.
 *
 * Re-runnable. Run it again after rotating the key.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const CREDENTIALS_FILE =
  process.env.CREDENTIALS_FILE ?? join(ROOT, 'docs', 'supa_keys.md');

if (!existsSync(CREDENTIALS_FILE)) {
  console.error(`No credential file at ${CREDENTIALS_FILE}.`);
  process.exit(1);
}

const creds = Object.fromEntries(
  readFileSync(CREDENTIALS_FILE, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('='))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    })
);

const projectUrl = creds.project_url;
const serviceKey = creds.service_role_secret;

if (!projectUrl || !serviceKey) {
  console.error('Credential file needs project_url and service_role_secret.');
  process.exit(1);
}

const base = projectUrl.replace(/\/$/, '');
const functionsUrl = `${base}/functions/v1`;

const response = await fetch(`${base}/rest/v1/job_secrets`, {
  method: 'POST',
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates',
  },
  body: JSON.stringify([
    { key: 'functions_url', value: functionsUrl },
    { key: 'service_role_key', value: serviceKey },
  ]),
});

if (!response.ok) {
  // Redact before printing: a PostgREST error can quote the row it rejected.
  const text = (await response.text()).split(serviceKey).join('<redacted>');
  console.error(`HTTP ${response.status} ${text}`);
  process.exit(1);
}

console.log(`functions_url    = ${functionsUrl}`);
console.log('service_role_key = <not printed>');
console.log('\nStored in public.job_secrets — RLS on, no policy, no grants.');
