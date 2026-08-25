#!/usr/bin/env node
/**
 * Cross-checks the database's draw against an independent implementation.
 *
 *   npm run verify:draw
 *
 * The point is not to test that the code runs. It is to have two
 * implementations, written from the constitution rather than from each other,
 * that must agree — so a mistake in either one shows up as a disagreement
 * rather than as a plausible-looking winner.
 *
 * Needs network and a configured .env, so it is not part of `npm run verify`,
 * which must work offline.
 */

import { createHash, createHmac } from 'node:crypto';

import { loadVerificationTarget } from './lib/verification-target.mjs';

const { url, publicKey: key, label: targetLabel } = loadVerificationTarget();

async function rpc(name, body) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `${name}: HTTP ${response.status} ${await response.text()}`
    );
  }
  return response.json();
}

// --- the independent implementation -----------------------------------------

const rank = (seed, id) => createHmac('sha256', seed).update(id).digest('hex');

const order = (seed, ids) =>
  [...ids].sort((a, b) => {
    const ra = rank(seed, a);
    const rb = rank(seed, b);
    return ra === rb ? (a < b ? -1 : 1) : ra < rb ? -1 : 1;
  });

const hash = (ids) =>
  createHash('sha256')
    .update([...ids].sort().join(','))
    .digest('hex');

// --- deterministic sample pool ----------------------------------------------

function uuidFrom(n) {
  const hex = createHash('sha256').update(String(n)).digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

const pool = Array.from({ length: 25 }, (_, index) => uuidFrom(index));
const seeds = ['seed-one', 'seed-two', 'a'.repeat(64), '0123456789abcdef'];

let failures = 0;

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`);
  if (!ok) {
    failures += 1;
    console.log(`        postgres    ${JSON.stringify(actual)}`);
    console.log(`        independent ${JSON.stringify(expected)}`);
  }
}

console.log(`Cross-checking draw against ${targetLabel}\n`);

console.log('draw_order');
for (const seed of seeds) {
  check(
    `seed "${seed.slice(0, 16)}" over ${pool.length} candidates`,
    await rpc('draw_order', { seed, ids: pool }),
    order(seed, pool)
  );
}

console.log('\ndraw_rank');
for (const seed of seeds.slice(0, 2)) {
  check(
    `rank of one candidate under "${seed.slice(0, 16)}"`,
    await rpc('draw_rank', { seed, candidate: pool[0] }),
    rank(seed, pool[0])
  );
}

console.log('\npool_hash');
check(
  'hash of the full pool',
  await rpc('pool_hash', { ids: pool }),
  hash(pool)
);
check(
  'hash is independent of input order',
  await rpc('pool_hash', { ids: [...pool].reverse() }),
  hash(pool)
);
check(
  'hash of the empty pool',
  await rpc('pool_hash', { ids: [] }),
  createHash('sha256').update('').digest('hex')
);

console.log(
  failures === 0
    ? '\nThe database and the independent implementation agree.'
    : `\n${failures} disagreement(s). One of the two is wrong.`
);

process.exit(failures === 0 ? 0 : 1);
