#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { format } from 'prettier';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const TARGET = join(ROOT, 'src', 'lib', 'supabase', 'database.generated.ts');
const WRITE = process.argv.includes('--write');

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
  console.error(
    'Generated database types are stale. Run npm run db:types:local and commit the result.'
  );
  process.exit(1);
}

console.log('Generated database types match the fresh local schema.');
