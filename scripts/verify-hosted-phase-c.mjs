#!/usr/bin/env node

/**
 * Runs the bounded Phase C probes against the single hosted project.
 *
 * Each child verifier owns its own synthetic data and cleanup. The runner
 * deliberately continues after a failure so later verifiers still get a
 * chance to clean up their fixtures and the final result reports every failed
 * probe. Hosted execution is restricted to the protected GitHub workflow.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

if (!process.env.CI || process.env.GITHUB_ACTIONS !== 'true') {
  console.error(
    'Hosted Phase C verification is CI-only. Use the protected workflow.'
  );
  process.exit(1);
}

const releaseSha = process.env.RELEASE_SHA;
if (!/^[0-9a-f]{40}$/i.test(releaseSha ?? '')) {
  console.error('Hosted Phase C verification needs a full RELEASE_SHA.');
  process.exit(1);
}

const checkedOutSha = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: ROOT,
  encoding: 'utf8',
}).trim();
if (checkedOutSha !== releaseSha) {
  console.error('The hosted verification checkout does not match RELEASE_SHA.');
  process.exit(1);
}

const probes = [
  ['anonymous privilege boundary', 'verify-privileges.mjs'],
  ['signed-in security boundary', 'verify-security.mjs'],
  ['draw integrity', 'verify-draw.mjs'],
  ['safety and privacy effects', 'verify-safety-privacy.mjs'],
  ['memory and international effects', 'verify-memory-international.mjs'],
  ['Edge Function contracts', 'verify-edge-functions.mjs'],
  ['retryable account deletion', 'verify-delete-account.mjs'],
  ['bounded complete-cycle simulation', 'simulate-cycle.mjs'],
];

const failures = [];
for (const [label, filename] of probes) {
  console.log(`\n=== ${label} (${filename}) ===`);
  const result = spawnSync(
    process.execPath,
    [join(ROOT, 'scripts', filename), '--live'],
    {
      cwd: ROOT,
      env: process.env,
      stdio: 'inherit',
    }
  );

  if (result.error) {
    failures.push(`${label}: ${result.error.message}`);
  } else if (result.status !== 0) {
    failures.push(`${label}: exit ${result.status ?? 'unknown'}`);
  }
}

console.log('\n=== Phase C hosted verification summary ===');
console.log(`Tested SHA: ${releaseSha}`);
if (failures.length > 0) {
  console.error(`Failed probe(s):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`All ${probes.length} bounded hosted probes passed.`);
