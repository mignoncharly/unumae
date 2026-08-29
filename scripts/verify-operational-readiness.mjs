#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');
const failures = [];
const requireText = (source, text, label) => {
  if (!source.includes(text)) failures.push(label);
};
const forbidText = (source, text, label) => {
  if (source.includes(text)) failures.push(label);
};

const ci = read('.github', 'workflows', 'ci.yml');
requireText(ci, 'supabase start', 'CI must start a disposable local database.');
forbidText(
  ci,
  'SUPABASE_ACCESS_TOKEN',
  'CI must not receive hosted access credentials.'
);
forbidText(
  ci,
  'SUPABASE_PROJECT_REF',
  'CI must not receive a hosted project ref.'
);

const promotion = read('.github', 'workflows', 'promote.yml');
for (const contract of [
  'verify-ci-provenance.mjs',
  'environment: production',
  'Capture sanitized pre-deployment baseline',
  'supabase db push --linked',
  'supabase functions deploy',
  'Capture sanitized post-deployment baseline',
]) {
  requireText(
    promotion,
    contract,
    `Promotion workflow is missing: ${contract}`
  );
}

const phaseC = read('.github', 'workflows', 'hosted-phase-c.yml');
for (const contract of [
  'environment: production',
  'Require successful CI for this exact SHA',
  'verify-hosted-parity.mjs',
  'Capture sanitized pre-verification baseline',
  'npm run verify:hosted',
  'Capture sanitized post-verification baseline',
  'Compare sanitized baselines',
]) {
  requireText(
    phaseC,
    contract,
    `Phase C hosted workflow is missing: ${contract}`
  );
}
const backup = read('.github', 'workflows', 'production-backup.yml');
for (const contract of [
  'pg_dump',
  'export-storage-backup.mjs',
  'age --recipient',
  'actions/upload-artifact',
  'retention-days: 35',
  'if: failure()',
]) {
  requireText(backup, contract, `Backup workflow is missing: ${contract}`);
}
const restore = read('.github', 'workflows', 'restore-rehearsal.yml');
for (const contract of [
  'sha256sum --check',
  'age --decrypt',
  'actions/download-artifact',
  'RESTORE_DATABASE_URL',
  'pg_restore',
  'Elapsed:',
]) {
  requireText(restore, contract, `Restore workflow is missing: ${contract}`);
}
forbidText(
  restore,
  'supabase start',
  'Restore workflow must not start a local Supabase stack.'
);
forbidText(
  restore,
  'supabase stop',
  'Restore workflow must not stop a local Supabase stack.'
);

const migration = read(
  'supabase',
  'migrations',
  '20260826120000_phase10_operational_readiness.sql'
);
for (const contract of [
  'vault.create_secret',
  'vault.decrypted_secrets',
  'drop table if exists public.job_secrets',
  'configure_job_secret',
]) {
  requireText(migration, contract, `Vault migration is missing: ${contract}`);
}
forbidText(
  read('.env.example'),
  'supabase.co',
  'Local .env example must not point at a hosted project.'
);
for (const path of [
  ['scripts', 'db-settings.mjs'],
  ['scripts', 'dev-code.mjs'],
  ['scripts', 'capture-production-baseline.mjs'],
  ['scripts', 'lib', 'verification-target.mjs'],
]) {
  const source = read(...path);
  forbidText(
    source,
    'supa_keys.md',
    `${path.join('/')} must not read a hosted credential file.`
  );
  forbidText(
    source,
    'service_role_secret',
    `${path.join('/')} must not parse a local service-role credential.`
  );
}

const eas = JSON.parse(read('eas.json'));
for (const profile of ['development', 'development-simulator', 'e2e-test']) {
  if (eas.build?.[profile]?.environment !== 'production') {
    failures.push(`EAS ${profile} must use the single hosted environment.`);
  }
  if (eas.build?.[profile]?.env?.APP_ENV !== 'hosted') {
    failures.push(
      `EAS ${profile} must identify itself as a hosted test build.`
    );
  }
}
if (eas.build?.staging) {
  failures.push('EAS must not define a staging profile.');
}
if (eas.build?.production?.environment !== 'production') {
  failures.push('EAS production must use the single hosted environment.');
}

if (failures.length > 0) {
  console.error(
    `Operational-readiness verification failed:\n- ${failures.join('\n- ')}`
  );
  process.exit(1);
}
console.log('Operational-readiness boundaries passed.');
