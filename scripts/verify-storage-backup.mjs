#!/usr/bin/env node

/**
 * Verifies an extracted storage backup against the manifest produced by
 * export-storage-backup.mjs. This is intentionally independent of Supabase so
 * the restore rehearsal can prove the bytes survived encryption and transfer.
 */

import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? 'restore/storage');
const manifestPath = join(root, 'manifest.json');
const failures = [];

function fail(message) {
  failures.push(message);
}

function safeObjectPath(bucket, objectName) {
  if (
    !/^[a-z0-9][a-z0-9_-]{1,62}$/.test(bucket) ||
    typeof objectName !== 'string' ||
    objectName.length === 0
  ) {
    return null;
  }
  const segments = objectName.split('/');
  if (
    segments.some(
      (segment) =>
        segment.length === 0 ||
        segment === '.' ||
        segment === '..' ||
        segment.includes('\\')
    )
  ) {
    return null;
  }

  const target = resolve(root, bucket, objectName);
  const bucketRoot = resolve(root, bucket);
  if (target !== bucketRoot && !target.startsWith(`${bucketRoot}${sep}`)) {
    return null;
  }
  return target;
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch {
  throw new Error('Storage backup manifest is missing or invalid.');
}

if (!Array.isArray(manifest.objects)) {
  throw new Error('Storage backup manifest has no object list.');
}

const expected = new Map();
for (const item of manifest.objects) {
  if (
    !item ||
    typeof item !== 'object' ||
    typeof item.bucket !== 'string' ||
    typeof item.object !== 'string' ||
    !Number.isSafeInteger(item.bytes) ||
    item.bytes < 0 ||
    !/^[a-f0-9]{64}$/.test(item.sha256)
  ) {
    fail('Storage backup manifest contains an invalid object entry.');
    continue;
  }

  const target = safeObjectPath(item.bucket, item.object);
  if (!target) {
    fail('Storage backup manifest contains an unsafe object path.');
    continue;
  }

  const key = relative(root, target);
  if (expected.has(key)) {
    fail(`Storage backup manifest contains a duplicate object: ${key}`);
    continue;
  }
  expected.set(key, item);

  let stat;
  try {
    stat = lstatSync(target);
  } catch {
    fail(`Storage backup object is missing: ${key}`);
    continue;
  }
  if (!stat.isFile()) {
    fail(`Storage backup object is not a regular file: ${key}`);
    continue;
  }
  if (stat.size !== item.bytes) {
    fail(`Storage backup object size mismatch: ${key}`);
    continue;
  }

  const digest = createHash('sha256')
    .update(readFileSync(target))
    .digest('hex');
  if (digest !== item.sha256) {
    fail(`Storage backup object checksum mismatch: ${key}`);
  }
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) return walk(target);
    return entry.name === 'manifest.json' ? [] : [relative(root, target)];
  });
}

for (const key of walk(root)) {
  if (!expected.has(key)) {
    fail(`Storage backup contains an unlisted object: ${key}`);
  }
}

if (failures.length > 0) {
  throw new Error(
    `Storage backup verification failed:\n- ${failures.join('\n- ')}`
  );
}

const buckets = new Set(manifest.objects.map((item) => item.bucket));
console.log(
  `Storage backup verified: ${manifest.objects.length} object(s) in ${buckets.size} bucket(s).`
);
