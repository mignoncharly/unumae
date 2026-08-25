#!/usr/bin/env node

import { randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import { loadVerificationTarget } from './lib/verification-target.mjs';

const { url, publicKey, secretKey, label } = loadVerificationTarget();
const functionsUrl = `${url.replace(/\/$/, '')}/functions/v1`;
const admin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const userAuth = createClient(url, publicKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const serviceFunctions = [
  'enforce-account-status',
  'process-account-deletions',
  'reconcile-storage',
  'send-notifications',
  'translate-portraits',
];
const userFunctions = ['delete-account', 'register-portrait-photo'];
const allFunctions = [...serviceFunctions, ...userFunctions];
let failures = 0;
let userId;
let correlationId;
const jobRunIds = [];

function check(value, description, detail = '') {
  const passed = Boolean(value);
  console.log(
    `  ${passed ? 'ok  ' : 'FAIL'}  ${description}${detail ? ` — ${detail}` : ''}`
  );
  if (!passed) failures += 1;
}

async function call(name, { method = 'POST', token, body } = {}) {
  return fetch(`${functionsUrl}/${name}`, {
    method,
    headers: {
      apikey: publicKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined
      ? {}
      : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
}

async function cleanup() {
  if (userId) await admin.auth.admin.deleteUser(userId).catch(() => undefined);
  if (correlationId) {
    await admin
      .from('deletion_requests')
      .delete()
      .eq('correlation_id', correlationId);
  }
  if (jobRunIds.length > 0) {
    await admin.from('job_runs').delete().in('id', jobRunIds);
  }
}

console.log(`Edge Function verification against ${label}`);

try {
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await call('delete-account', { method: 'OPTIONS' });
      ready = response.status === 200;
    } catch {
      // The local Edge runtime is still starting.
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!ready)
    throw new Error('Edge runtime did not become ready in 30 seconds');

  console.log('\nprotocol boundary');
  for (const name of allFunctions) {
    const options = await call(name, { method: 'OPTIONS' });
    check(
      options.status === 200 &&
        options.headers.get('access-control-allow-origin') === '*' &&
        options.headers.get('access-control-allow-methods')?.includes('POST'),
      `${name} accepts CORS preflight`
    );

    const wrongMethod = await call(name, { method: 'GET' });
    check(wrongMethod.status === 405, `${name} rejects unsupported methods`);

    const missingJwt = await call(name, { body: {} });
    check(missingJwt.status === 401, `${name} rejects a missing JWT`);

    const malformedJwt = await call(name, { token: 'malformed', body: {} });
    check(malformedJwt.status === 401, `${name} rejects a malformed JWT`);
  }

  console.log('\nservice-role boundary and job completion');
  for (const name of serviceFunctions) {
    const queued = await admin
      .from('job_runs')
      .insert({ job: `phase3-${name}`, ok: false, status: 'queued' })
      .select('id')
      .single();
    if (queued.error || !queued.data) throw queued.error;
    jobRunIds.push(queued.data.id);

    const denied = await call(name, { token: publicKey, body: {} });
    check(denied.status === 401, `${name} rejects the public API credential`);

    const response = await call(name, {
      token: secretKey,
      body: { jobRunId: queued.data.id },
    });
    check(response.ok, `${name} accepts the service credential`);

    const completed = await admin
      .from('job_runs')
      .select('status,completed_at,detail')
      .eq('id', queued.data.id)
      .single();
    check(
      completed.data?.status === 'succeeded' &&
        completed.data.completed_at !== null &&
        completed.data.detail !== null,
      `${name} records its scheduler outcome`
    );
  }

  console.log('\nuser JWT, invalid bodies, and idempotency');
  const marker = randomUUID();
  const email = `phase3-edge-${marker}@example.test`;
  const password = `${randomUUID()}Aa1!`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) throw created.error;
  userId = created.data.user.id;

  const profile = await admin.from('profiles').insert({
    id: userId,
    username: `edge_${marker.replaceAll('-', '').slice(0, 12)}`,
    display_name: 'Phase 3 Edge verifier',
    birth_year: 1990,
    country_code: 'DE',
    wants_selection: false,
    locale: 'en',
  });
  if (profile.error) throw profile.error;

  const signedIn = await userAuth.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) throw signedIn.error;
  const userToken = signedIn.data.session.access_token;

  for (const name of serviceFunctions) {
    const denied = await call(name, { token: userToken, body: {} });
    check(denied.status === 401, `${name} rejects a normal user JWT`);
  }

  const invalidDelete = await call('delete-account', {
    token: userToken,
    body: '{',
  });
  check(invalidDelete.status === 400, 'delete-account rejects malformed JSON');

  const invalidPhoto = await call('register-portrait-photo', {
    token: userToken,
    body: { portraitId: 'not-a-uuid', objectPath: 'not/a/path' },
  });
  check(
    invalidPhoto.status === 400,
    'register-portrait-photo rejects invalid identifiers and paths'
  );

  const idempotencyKey = randomUUID();
  const first = await call('delete-account', {
    token: userToken,
    body: { idempotencyKey },
  });
  const firstBody = await first.json();
  correlationId = firstBody.correlationId;
  check(first.status === 202, 'delete-account accepts a valid request');

  const repeated = await call('delete-account', {
    token: userToken,
    body: { idempotencyKey },
  });
  const repeatedBody = await repeated.json();
  check(
    repeated.status === 202 &&
      repeatedBody.correlationId === firstBody.correlationId,
    'delete-account reuses the durable request idempotently'
  );

  const processed = await call('process-account-deletions', {
    token: secretKey,
    body: {},
  });
  const processedBody = await processed.json();
  check(
    processed.ok && processedBody.completed === 1,
    'deletion worker completes the accepted request'
  );

  const authLookup = await admin.auth.admin.getUserById(userId);
  check(
    authLookup.error?.status === 404 || !authLookup.data.user,
    'Auth user is absent after worker completion'
  );
  userId = undefined;
} catch (error) {
  console.error(
    `\nEdge verification failed: ${error instanceof Error ? error.message : 'unknown error'}`
  );
  failures += 1;
} finally {
  await cleanup();
}

console.log(
  failures === 0
    ? '\nEdge Function contracts passed.'
    : `\n${failures} Edge Function check(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);
