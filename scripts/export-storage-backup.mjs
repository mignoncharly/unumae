#!/usr/bin/env node

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';

const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const outputRoot = resolve(process.argv[2] ?? 'storage-backup');
if (!baseUrl || !serviceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
const request = async (path, init = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok)
    throw new Error(`Storage API ${path}: HTTP ${response.status}`);
  return response;
};

const safeTarget = (bucket, objectName) => {
  const target = resolve(outputRoot, bucket, objectName);
  const bucketRoot = resolve(outputRoot, bucket);
  if (target !== bucketRoot && !target.startsWith(`${bucketRoot}${sep}`)) {
    throw new Error('Storage API returned an unsafe object path.');
  }
  return target;
};

mkdirSync(outputRoot, { recursive: true });
const buckets = await (await request('/storage/v1/bucket')).json();
const manifest = [];

for (const bucket of buckets) {
  const pending = [''];
  const visited = new Set();
  while (pending.length > 0) {
    const prefix = pending.pop();
    if (visited.has(prefix)) continue;
    visited.add(prefix);
    for (let offset = 0; ; offset += 100) {
      const entries = await (
        await request(
          `/storage/v1/object/list/${encodeURIComponent(bucket.id)}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              prefix,
              limit: 100,
              offset,
              sortBy: { column: 'name', order: 'asc' },
            }),
          }
        )
      ).json();
      for (const entry of entries) {
        const objectName = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (!entry.id) {
          pending.push(objectName);
          continue;
        }
        const encodedPath = objectName
          .split('/')
          .map(encodeURIComponent)
          .join('/');
        const bytes = Buffer.from(
          await (
            await request(
              `/storage/v1/object/authenticated/${encodeURIComponent(bucket.id)}/${encodedPath}`
            )
          ).arrayBuffer()
        );
        const target = safeTarget(bucket.id, objectName);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, bytes);
        manifest.push({
          bucket: bucket.id,
          object: objectName,
          bytes: bytes.length,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        });
      }
      if (entries.length < 100) break;
    }
  }
}

writeFileSync(
  join(outputRoot, 'manifest.json'),
  `${JSON.stringify({ createdAt: new Date().toISOString(), objects: manifest }, null, 2)}\n`
);
console.log(
  `Exported ${manifest.length} storage object(s) from ${buckets.length} bucket(s).`
);
