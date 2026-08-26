#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const projectRef = process.env.SUPABASE_PROJECT_REF;
const productionRef = process.env.PRODUCTION_PROJECT_REF;
const password = process.env.SUPABASE_DB_PASSWORD;

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (!process.env.CI || process.env.GITHUB_ACTIONS !== 'true') {
  fail(
    'Hosted deployment is CI-only. Use the protected hosted deployment workflow.'
  );
}
if (!/^[a-z0-9]{20}$/.test(projectRef ?? '')) {
  fail('The selected GitHub Environment needs SUPABASE_PROJECT_REF.');
}
if (!/^[a-z0-9]{20}$/.test(productionRef ?? '')) {
  fail('The selected GitHub Environment needs PRODUCTION_PROJECT_REF.');
}
if (!password)
  fail('The selected GitHub Environment needs SUPABASE_DB_PASSWORD.');
if (projectRef !== productionRef) {
  fail('Hosted deployment did not resolve to the single approved project.');
}

const status = spawnSync('supabase', ['--version'], { encoding: 'utf8' });
if (status.status !== 0) fail('Supabase CLI is unavailable.');
console.log(`Hosted target boundary verified for project ${projectRef}.`);
