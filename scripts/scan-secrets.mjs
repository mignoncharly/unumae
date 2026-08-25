#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
// Include untracked, non-ignored files so the local check catches a secret
// before it is staged; CI naturally sees the committed form of the same set.
const files = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  {
    cwd: ROOT,
    encoding: 'utf8',
  }
)
  .split('\0')
  .filter(Boolean);

const patterns = [
  {
    name: 'JWT-like credential',
    expression:
      /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
  {
    name: 'Supabase secret key',
    expression: /\bsb_secret_[A-Za-z0-9_-]{16,}\b/g,
  },
  {
    name: 'credential-bearing database URL',
    // Exclude source interpolation and the scanner's own *** redaction while
    // still matching literal username:password connection strings.
    expression: /postgres(?:ql)?:\/\/[^\s:@*${}]+:[^\s@*${}]+@[^\s"']+/gi,
  },
  {
    name: 'private key block',
    expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
];

const findings = [];
for (const relativePath of files) {
  let source;
  try {
    source = readFileSync(join(ROOT, relativePath), 'utf8');
  } catch {
    continue;
  }
  if (source.includes('\0')) continue;

  for (const { name, expression } of patterns) {
    expression.lastIndex = 0;
    for (const match of source.matchAll(expression)) {
      const line = source.slice(0, match.index).split('\n').length;
      findings.push({ relativePath, line, name });
    }
  }
}

if (findings.length > 0) {
  console.error('Potential committed secrets found:');
  for (const finding of findings) {
    console.error(
      `  ${finding.relativePath}:${finding.line} — ${finding.name}`
    );
  }
  process.exit(1);
}

console.log(`Secret scan passed across ${files.length} repository files.`);
