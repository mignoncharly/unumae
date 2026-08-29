import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const read = (relativePath) => readFileSync(join(ROOT, relativePath), 'utf8');
const fail = (message) => {
  throw new Error(`Growth readiness: ${message}`);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const growth = read('docs/GROWTH.md');
const beta = read('docs/BETA.md');
const handoff = read('docs/PHASE_15_GROWTH_READINESS.md');
const deferred = read('docs/DEFERRED.md');
const retention = read('src/constants/retention.ts');
const packageJson = JSON.parse(read('package.json'));

assert(
  packageJson.scripts['verify:growth'] ===
    'node scripts/verify-growth-readiness.mjs',
  'verify:growth script is missing'
);
assert(
  growth.includes(
    'Nothing in this document is permitted before `growth_gate()` passes'
  ),
  'growth gate precondition drifted'
);
assert(
  growth.includes('the only growth mechanism'),
  'growth mechanism changed'
);
for (const channel of ['TikTok', 'Instagram', 'X', 'Reddit']) {
  assert(
    growth.includes(`### ${channel}`),
    `growth channel is missing: ${channel}`
  );
}
for (const forbidden of [
  'Referral rewards',
  'Paying for placement',
  'Notifications to bring somebody back',
  'Buying users before the gate passes',
]) {
  assert(
    growth.includes(forbidden),
    `growth prohibition is missing: ${forbidden}`
  );
}
for (const event of ['share_started', 'share_sheet_opened']) {
  assert(
    growth.includes(event),
    `share measurement boundary is missing: ${event}`
  );
}
assert(beta.includes('Phase 15'), 'beta protocol does not identify Phase 15');
assert(
  /only if the gate is\s+open/.test(beta),
  'beta protocol can no longer gate growth'
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
for (const phrase of [
  'only after the Phase G',
  'Immature cohorts remain `null`',
  'aggregate-only',
  'real approved Human',
  'share_sheet_opened',
  'Stop conditions',
  'npm run scan:secrets',
]) {
  assert(handoff.includes(phrase), `growth handoff is missing: ${phrase}`);
}
assert(deferred.includes('post-launch'), 'post-launch deferrals are missing');
assert(deferred.includes('Monetization'), 'monetization deferral is missing');
assert(deferred.includes('Android'), 'Android deferral is missing');
assert(deferred.includes('Full web/PWA'), 'full web deferral is missing');

console.log('Growth readiness repository checks passed.');
console.log(
  'Owner gate remains closed until the mature four-week beta passes growth_gate().'
);
