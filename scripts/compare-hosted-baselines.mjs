#!/usr/bin/env node

/**
 * Compares two sanitized hosted baseline files while ignoring capture time.
 * The workflow keeps this logic in a repository script so shell indentation
 * cannot change the comparison behavior.
 */

import { readFileSync } from 'node:fs';

const [
  beforeFile = 'phase-c-pre-baseline.json',
  afterFile = 'phase-c-post-baseline.json',
] = process.argv.slice(2);

function normalizedSnapshot(file) {
  let snapshot;
  try {
    snapshot = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    throw new Error(`Could not read valid JSON from ${file}.`);
  }
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error(`Baseline ${file} did not contain a JSON object.`);
  }
  delete snapshot.captured_at_utc;
  return JSON.stringify(snapshot);
}

try {
  if (normalizedSnapshot(beforeFile) !== normalizedSnapshot(afterFile)) {
    console.error(
      'Sanitized hosted baseline changed during verification. Review the diff.'
    );
    process.exit(1);
  }
  console.log(
    'Sanitized hosted baseline is unchanged apart from capture time.'
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Baseline comparison failed.'
  );
  process.exit(1);
}
