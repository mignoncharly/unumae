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
let avatarPath;
let photoPath;
let mediaPath;
let failures = 0;

function check(value, labelText) {
  const passed = Boolean(value);
  console.log(`  ${passed ? 'ok  ' : 'FAIL'}  ${labelText}`);
  if (!passed) failures += 1;
}

async function cleanup() {
  if (avatarPath) await service.storage.from('avatars').remove([avatarPath]);
  if (photoPath && mediaPath) {
    await service.storage.from('portraits').remove([photoPath, mediaPath]);
  }
  if (drawId) await service.from('daily_draws').delete().eq('id', drawId);
  if (userId) await service.auth.admin.deleteUser(userId);
}

console.log(`Account-deletion verification against ${label}`);
try {
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) throw created.error;
  userId = created.data.user.id;
  avatarPath = `${userId}/avatar.jpg`;
  photoPath = `${userId}/photo.jpg`;
  mediaPath = `${userId}/voice.mp3`;

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
      selection_status: 'content_review',
    })
    .select('id')
    .single();
  if (draw.error) throw draw.error;
  drawId = draw.data.id;

  const portrait = await service.from('portraits').insert({
    draw_id: drawId,
    user_id: userId,
    status: 'draft',
    photo_path: photoPath,
    media_path: mediaPath,
  });
  if (portrait.error) throw portrait.error;

  for (const [bucket, path, contentType] of [
    ['avatars', avatarPath, 'image/jpeg'],
    ['portraits', photoPath, 'image/jpeg'],
    ['portraits', mediaPath, 'audio/mpeg'],
  ]) {
    const uploaded = await service.storage
      .from(bucket)
      .upload(path, new Blob(['release-verification'], { type: contentType }), {
        contentType,
        upsert: true,
      });
    if (uploaded.error) throw uploaded.error;
  }

  const userClient = createClient(url, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signedIn = await userClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signedIn.error) throw signedIn.error;

  const invoked = await userClient.functions.invoke('delete-account', {
    body: {},
  });
  check(!invoked.error && invoked.data?.deleted === true, 'function succeeds');

  const authUser = await service.auth.admin.getUserById(userId);
  check(!authUser.data.user, 'authentication account is deleted');

  const profileRows = await service
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('id', userId);
  check(profileRows.count === 0, 'profile data is deleted');

  const tombstone = await service
    .from('daily_draws')
    .select('selected_user_id')
    .eq('id', drawId)
    .single();
  check(
    !tombstone.error && tombstone.data.selected_user_id === null,
    'draw audit row remains as an anonymous tombstone'
  );

  const avatarObjects = await service.storage.from('avatars').list(userId);
  const portraitObjects = await service.storage.from('portraits').list(userId);
  check((avatarObjects.data?.length ?? 0) === 0, 'avatar storage is deleted');
  check(
    (portraitObjects.data?.length ?? 0) === 0,
    'portrait photo and media storage are deleted'
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  failures += 1;
} finally {
  await cleanup();
}

console.log(
  failures === 0
    ? 'Account deletion is complete on the deployed function.'
    : `${failures} account-deletion check(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);
