#!/usr/bin/env node

import { randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import { loadVerificationTarget } from './lib/verification-target.mjs';

const { url, publicKey, secretKey, label } = loadVerificationTarget();
const service = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const marker = randomUUID();
const email = `delete-${marker}@example.com`;
const password = `${randomUUID()}Aa1!`;
let userId;
let drawId;
let correlationId;
let jobRunId;
let failures = 0;

function check(value, labelText) {
  const passed = Boolean(value);
  console.log(`  ${passed ? 'ok  ' : 'FAIL'}  ${labelText}`);
  if (!passed) failures += 1;
}

async function listPrefix(bucket, rootPrefix) {
  const directories = [rootPrefix];
  const objects = [];
  while (directories.length > 0) {
    const prefix = directories.shift();
    for (let offset = 0; ; offset += 100) {
      const listed = await service.storage
        .from(bucket)
        .list(prefix, { limit: 100, offset });
      if (listed.error) throw listed.error;
      for (const entry of listed.data ?? []) {
        const path = `${prefix}/${entry.name}`;
        if (entry.id === null) directories.push(path);
        else objects.push(path);
      }
      if ((listed.data?.length ?? 0) < 100) break;
    }
  }
  return objects;
}

async function uploadInBatches(entries) {
  for (let offset = 0; offset < entries.length; offset += 10) {
    const results = await Promise.all(
      entries
        .slice(offset, offset + 10)
        .map(([bucket, path, contentType]) =>
          service.storage
            .from(bucket)
            .upload(
              path,
              new Blob(['phase2-deletion-verification'], { type: contentType }),
              { contentType, upsert: false }
            )
        )
    );
    const failure = results.find((result) => result.error);
    if (failure?.error) throw failure.error;
  }
}

async function cleanup() {
  if (userId) {
    for (const bucket of ['avatars', 'portraits']) {
      const paths = await listPrefix(bucket, userId).catch(() => []);
      for (let offset = 0; offset < paths.length; offset += 100) {
        await service.storage
          .from(bucket)
          .remove(paths.slice(offset, offset + 100));
      }
    }
    await service.auth.admin.deleteUser(userId);
  }
  if (drawId) await service.from('daily_draws').delete().eq('id', drawId);
  if (correlationId) {
    await service
      .from('deletion_requests')
      .delete()
      .eq('correlation_id', correlationId);
  }
  if (jobRunId) {
    await service.from('job_runs').delete().eq('id', jobRunId);
  }
}

console.log(`Retryable account-deletion verification against ${label}`);
try {
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) throw created.error;
  userId = created.data.user.id;

  const profile = await service.from('profiles').insert({
    id: userId,
    username: `delete_${marker.replaceAll('-', '').slice(0, 12)}`,
    display_name: 'Deletion verification',
    birth_year: 1990,
    country_code: 'DE',
    languages: ['en'],
    wants_selection: false,
  });
  if (profile.error) throw profile.error;

  const draw = await service
    .from('daily_draws')
    .insert({
      selection_date: '2099-12-30',
      candidate_pool_hash: 'd'.repeat(64),
      candidate_count: 1,
      random_seed: marker.replaceAll('-', '').padEnd(64, '0'),
      selected_user_id: userId,
      selection_status: 'completed',
      human_number: 999999,
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (draw.error) throw draw.error;
  drawId = draw.data.id;

  const referencedPhoto = `${userId}/${drawId}/nested/photo.jpg`;
  const portrait = await service.from('portraits').insert({
    draw_id: drawId,
    user_id: userId,
    status: 'draft',
    photo_path: referencedPhoto,
  });
  if (portrait.error) throw portrait.error;

  const push = await service.from('push_tokens').insert({
    user_id: userId,
    token: `ExponentPushToken[${marker}]`,
    platform: 'ios',
  });
  if (push.error) throw push.error;

  const analytics = await service.from('analytics_events').insert({
    user_id: userId,
    install_id: randomUUID(),
    event: 'app_opened',
  });
  if (analytics.error) throw analytics.error;

  const moderation = await service.from('moderation_events').insert({
    action: 'auto_flagged',
    subject_id: userId,
    reason: `deletion-verification-${marker}`,
  });
  if (moderation.error) throw moderation.error;

  const objects = [
    ['avatars', `${userId}/avatar/nested/avatar.jpg`, 'image/jpeg'],
    ['portraits', referencedPhoto, 'image/jpeg'],
    ...Array.from({ length: 105 }, (_, index) => [
      'portraits',
      `${userId}/orphans/nested/${String(index).padStart(3, '0')}.jpg`,
      'image/jpeg',
    ]),
  ];
  await uploadInBatches(objects);

  const userClient = createClient(url, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signedIn = await userClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signedIn.error) throw signedIn.error;

  const invoked = await userClient.functions.invoke('delete-account', {
    body: { idempotencyKey: randomUUID() },
  });
  check(
    !invoked.error && invoked.data?.accepted === true,
    'request is accepted asynchronously'
  );
  correlationId = invoked.data?.correlationId;

  const lockedProfile = await service
    .from('profiles')
    .select('account_status')
    .eq('id', userId)
    .single();
  check(
    lockedProfile.data?.account_status === 'deletion_pending',
    'account is locked before any destructive work'
  );

  const workerRun = await service
    .from('job_runs')
    .insert({
      job: 'process-account-deletions',
      ok: false,
      status: 'queued',
    })
    .select('id')
    .single();
  if (workerRun.error || !workerRun.data) throw workerRun.error;
  jobRunId = workerRun.data.id;

  let authDeleted = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const processed = await service.functions.invoke(
      'process-account-deletions',
      {
        body: { jobRunId },
      }
    );
    if (processed.error) throw processed.error;
    const authUser = await service.auth.admin.getUserById(userId);
    if (!authUser.data.user) {
      authDeleted = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  check(authDeleted, 'Auth account is deleted last');

  const deletion = await service
    .from('deletion_requests')
    .select('current_stage,user_id,completed_at,last_error_code')
    .eq('correlation_id', correlationId)
    .single();
  check(
    deletion.data?.current_stage === 'completed',
    'state reaches completed'
  );
  check(deletion.data?.user_id === null, 'completed request is anonymized');
  check(deletion.data?.completed_at, 'completion timestamp is recorded');
  check(!deletion.data?.last_error_code, 'no provider response is retained');

  const profileRows = await service
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('id', userId);
  check(profileRows.count === 0, 'profile graph is deleted');

  const tokenRows = await service
    .from('push_tokens')
    .select('token', { count: 'exact', head: true })
    .eq('user_id', userId);
  check(
    !tokenRows.error && tokenRows.count === 0,
    'notification tokens are deleted'
  );

  const tombstone = await service
    .from('daily_draws')
    .select('selected_user_id,human_number')
    .eq('id', drawId)
    .single();
  check(
    tombstone.data?.selected_user_id === null &&
      tombstone.data?.human_number === 999999,
    'draw survives only as an anonymous tombstone'
  );

  const audit = await service
    .from('moderation_events')
    .select('subject_id')
    .eq('reason', `deletion-verification-${marker}`)
    .single();
  check(audit.data?.subject_id === null, 'moderation audit is anonymized');

  const avatarObjects = await listPrefix('avatars', userId);
  const portraitObjects = await listPrefix('portraits', userId);
  check(avatarObjects.length === 0, 'nested avatar prefix is empty');
  check(
    portraitObjects.length === 0,
    'referenced and 105 nested orphan portrait objects are gone'
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  failures += 1;
} finally {
  await cleanup();
}

console.log(
  failures === 0
    ? 'Retryable account deletion is complete.'
    : `${failures} account-deletion check(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);
