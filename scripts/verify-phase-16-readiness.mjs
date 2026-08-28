import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const read = (relativePath) => readFileSync(join(ROOT, relativePath), 'utf8');
const fail = (message) => {
  throw new Error(`Phase 16 readiness: ${message}`);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const deferred = read('docs/DEFERRED.md');
const handoff = read('docs/PHASE_16_SCALE_READINESS.md');
const constitution = read('docs/PRODUCT_CONSTITUTION.md');
const growth = read('docs/PHASE_15_GROWTH_READINESS.md');
const packageJson = JSON.parse(read('package.json'));

assert(
  packageJson.scripts['verify:phase-16'] ===
    'node scripts/verify-phase-16-readiness.mjs',
  'verify:phase-16 script is missing'
);
for (const phrase of [
  'AI Interview Assistant',
  'Human Story Engine',
  'Where Are They Now?',
]) {
  assert(deferred.includes(phrase), `deferred feature is missing: ${phrase}`);
  assert(handoff.includes(phrase), `handoff feature is missing: ${phrase}`);
}
assert(
  deferred.includes('Three features from Phase 16'),
  'Phase 16 deferral scope changed'
);
assert(
  deferred.includes('never write a personality'),
  'AI authorship guardrail is missing'
);
assert(
  deferred.includes('Every word in a portrait has to be'),
  'AI source-of-truth guardrail is missing'
);
assert(deferred.includes('five years'), 'revisit timing guardrail is missing');
for (const phrase of [
  'design-only and closed',
  'separate draft surface',
  'no view score',
  'fresh consent',
  'five years',
  'Explicitly still deferred',
  'npm run scan:secrets',
]) {
  assert(handoff.includes(phrase), `Phase 16 handoff is missing: ${phrase}`);
}
assert(
  /never a\s+personality or ghostwriter/.test(handoff),
  'Phase 16 handoff is missing: never a personality or ghostwriter'
);
for (const phrase of [
  'No followers.',
  'No popularity contest.',
  'No paying for a better chance.',
  'A permanent archive.',
  'Moderation before publication.',
]) {
  assert(
    constitution.includes(phrase),
    `constitution constraint is missing: ${phrase}`
  );
}
assert(
  growth.includes('only after the Phase G'),
  'Phase 15 must remain upstream of Phase 16'
);
assert(growth.includes('growth_gate()'), 'Phase 15 gate reference is missing');

console.log('Phase 16 repository readiness checks passed.');
console.log(
  'Owner decision remains required before any deferred feature is implemented.'
);
