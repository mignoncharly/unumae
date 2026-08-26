#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const target = process.argv[2];
const projectRef = process.env.SUPABASE_PROJECT_REF;
const productionRef = process.env.PRODUCTION_PROJECT_REF;
const password = process.env.SUPABASE_DB_PASSWORD;

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (!process.env.CI || process.env.GITHUB_ACTIONS !== 'true') {
  fail(
    'Hosted promotion is CI-only. Use the Promote hosted environment workflow.'
  );
}
if (!['staging', 'production'].includes(target)) {
  fail('Promotion target must be staging or production.');
}
if (!/^[a-z0-9]{20}$/.test(projectRef ?? '')) {
  fail('The selected GitHub Environment needs SUPABASE_PROJECT_REF.');
}
if (!/^[a-z0-9]{20}$/.test(productionRef ?? '')) {
  fail('The selected GitHub Environment needs PRODUCTION_PROJECT_REF.');
}
if (!password)
  fail('The selected GitHub Environment needs SUPABASE_DB_PASSWORD.');
if (target === 'staging' && projectRef === productionRef) {
  fail('Staging resolved to the production project; refusing promotion.');
}
if (target === 'production' && projectRef !== productionRef) {
  fail('Production did not resolve to the approved production project.');
}

const status = spawnSync('supabase', ['--version'], { encoding: 'utf8' });
if (status.status !== 0) fail('Supabase CLI is unavailable.');
console.log(`${target} target boundary verified for project ${projectRef}.`);
