#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { format } from 'prettier';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const TARGET = join(ROOT, 'src', 'lib', 'supabase', 'database.generated.ts');
const WRITE = process.argv.includes('--write');

function printBoundedLineDiff(actual, expected) {
  const actualLines = actual.split('\n');
  const expectedLines = expected.split('\n');
  const window = 40;
  const limit = 160;
  let actualIndex = 0;
  let expectedIndex = 0;
  let emitted = 0;

  console.error('Generated type drift (actual -, expected +):');

  while (
    actualIndex < actualLines.length &&
    expectedIndex < expectedLines.length &&
    emitted < limit
  ) {
    if (actualLines[actualIndex] === expectedLines[expectedIndex]) {
      actualIndex += 1;
      expectedIndex += 1;
      continue;
    }

    let best = null;
    for (let actualSkip = 0; actualSkip <= window; actualSkip += 1) {
      for (let expectedSkip = 0; expectedSkip <= window; expectedSkip += 1) {
        if (actualSkip === 0 && expectedSkip === 0) continue;
        if (
          actualIndex + actualSkip >= actualLines.length ||
          expectedIndex + expectedSkip >= expectedLines.length ||
          actualLines[actualIndex + actualSkip] !==
            expectedLines[expectedIndex + expectedSkip]
        ) {
          continue;
        }
        const distance = actualSkip + expectedSkip;
        if (!best || distance < best.distance) {
          best = { actualSkip, expectedSkip, distance };
        }
      }
    }

    if (!best) {
      best = { actualSkip: 1, expectedSkip: 1, distance: 2 };
    }

    for (
      let index = 0;
      index < best.actualSkip && emitted < limit;
      index += 1
    ) {
      console.error(`- ${actualLines[actualIndex + index]}`);
      emitted += 1;
    }
    for (
      let index = 0;
      index < best.expectedSkip && emitted < limit;
      index += 1
    ) {
      console.error(`+ ${expectedLines[expectedIndex + index]}`);
      emitted += 1;
    }

    actualIndex += best.actualSkip;
    expectedIndex += best.expectedSkip;
  }

  if (
    emitted >= limit ||
    actualIndex < actualLines.length ||
    expectedIndex < expectedLines.length
  ) {
    console.error(`Diff output limited to ${limit} changed lines.`);
  }
}

let generated;
try {
  const supabaseExecutable =
    process.platform === 'win32' ? 'supabase.exe' : 'supabase';
  generated = execFileSync(
    supabaseExecutable,
    ['gen', 'types', 'typescript', '--local'],
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
} catch {
  console.error(
    'Could not generate database types. Start the local Supabase stack first.'
  );
  process.exit(1);
}

const header = `/**
 * Generated from the fresh local database by npm run db:types:local.
 * Do not edit by hand. The narrower app contract remains in types.ts.
 */
`;
const expected = await format(`${header}${generated}`, {
  parser: 'typescript',
  singleQuote: true,
});

if (WRITE) {
  writeFileSync(TARGET, expected, 'utf8');
  console.log('Wrote src/lib/supabase/database.generated.ts');
  process.exit(0);
}

let actual = '';
try {
  actual = readFileSync(TARGET, 'utf8').replaceAll('\r\n', '\n');
} catch {
  console.error(
    'Generated database types are missing. Run npm run db:types:local.'
  );
  process.exit(1);
}

if (actual !== expected.replaceAll('\r\n', '\n')) {
  printBoundedLineDiff(actual, expected.replaceAll('\r\n', '\n'));
  console.error(
    'Generated database types are stale. Run npm run db:types:local and commit the result.'
  );
  process.exit(1);
}

console.log('Generated database types match the fresh local schema.');
