import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const read = (relativePath) => readFileSync(join(ROOT, relativePath), 'utf8');
const fail = (message) => {
  throw new Error(`Phase G readiness: ${message}`);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const beta = read('docs/BETA.md');
const handoff = read('docs/PHASE_G_LAUNCH_READINESS.md');
const release = read('docs/RELEASE_CHECKLIST.md');
const retention = read('src/constants/retention.ts');
const migration = read(
  'supabase/migrations/20260823070000_founding_and_retention.sql'
);
const growth = read('docs/GROWTH.md');
const runbooks = read('docs/INCIDENT_RUNBOOKS.md');
const packageJson = JSON.parse(read('package.json'));

assert(
  packageJson.scripts['verify:phase-g'] ===
    'node scripts/verify-phase-g-readiness.mjs',
  'verify:phase-g script is missing'
);
assert(
  retention.includes('D1_RETENTION_THRESHOLD = 25'),
  'D1 threshold drifted'
);
assert(
  retention.includes('D7_RETENTION_THRESHOLD = 10'),
  'D7 threshold drifted'
);
assert(
  retention.includes('PARTICIPATION_THRESHOLD = 15'),
  'participation threshold drifted'
);
assert(
  retention.includes('SHARE_RATE_THRESHOLD = 3'),
  'share threshold drifted'
);
assert(retention.includes('GATE_WINDOW_DAYS = 28'), 'gate window drifted');
for (const value of [
  '25.0::numeric',
  '10.0::numeric',
  '15.0::numeric',
  '3.0::numeric',
]) {
  assert(migration.includes(value), `migration threshold is missing ${value}`);
}

for (const phrase of [
  'npm run simulate',
  'Internal Alpha',
  'Private Beta',
  'Let four weeks pass',
  'growth_gate()',
  'd1_retention',
  'd7_retention',
  'share_rate',
  'Immature cohorts report `null`',
]) {
  assert(beta.includes(phrase), `beta protocol is missing: ${phrase}`);
}
for (const phrase of [
  '10–20 people',
  '100 active people',
  'aggregate counts',
  'D1 retention',
  'D7 retention',
  '25%',
  '10%',
  '15%',
  '3%',
  'Quiet Day',
  'rollback',
  'npm run scan:secrets',
]) {
  assert(handoff.includes(phrase), `Phase G handoff is missing: ${phrase}`);
}
for (const phrase of [
  'Alerts and job history were watched through the next daily cycle.',
  'Rollback owner and trigger were named before promotion.',
]) {
  assert(release.includes(phrase), `release checklist is missing: ${phrase}`);
}
assert(
  growth.includes(
    'Nothing in this document is permitted before `growth_gate()` passes'
  ),
  'growth gate precondition drifted'
);
assert(
  runbooks.includes('After every incident, document detection gap'),
  'incident evidence rule drifted'
);

console.log('Phase G repository readiness checks passed.');
console.log(
  'Owner gates remain: alpha/beta participants, physical release evidence, staffed operations, and first post-release cycle.'
);
