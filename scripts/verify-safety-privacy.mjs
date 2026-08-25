#!/usr/bin/env node
/**
 * Executes the Phase 2 safety/privacy effects against the local Supabase stack,
 * or the live project with `--live`. It never prints credentials and removes
 * every synthetic row.
 */
import { createHash, randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import { loadVerificationTarget } from './lib/verification-target.mjs';

const { url, publicKey, secretKey, label } = loadVerificationTarget();

const service = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const users = [];
const drawIds = [];
const deviceFlagIds = [];
let failures = 0;

function check(value, label) {
  const passed = Boolean(value);
  console.log(`  ${passed ? 'ok  ' : 'FAIL'}  ${label}`);
  if (!passed) failures += 1;
}

async function makeUser(label) {
  const emailLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const email = `phase2-${emailLabel}-${randomUUID()}@example.com`;
  const password = `${randomUUID()}Aa1!`;
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) throw created.error;
  const id = created.data.user.id;
  users.push(id);

  const profile = await service.from('profiles').insert({
    id,
    username: `p2_${randomUUID().replaceAll('-', '').slice(0, 12)}`,
    display_name: label,
    birth_year: 1990,
    country_code: 'DE',
    languages: ['en'],
    verification_level: 'email',
    selection_eligible: true,
    accepted_rules_at: new Date().toISOString(),
  });
  if (profile.error) throw profile.error;

  const client = createClient(url, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  return { id, client };
}

async function createInstallationSession(userId) {
  const raw = `phase6-${randomUUID()}`;
  const digest = (value) =>
    `\\x${createHash('sha256').update(value).digest('hex')}`;
  const flag = await service
    .from('device_binding_flags')
    .insert({ platform: 'ios', opaque_binding_hash: digest(`device-${raw}`) })
    .select('id')
    .single();
  if (flag.error || !flag.data) throw flag.error;
  deviceFlagIds.push(flag.data.id);
  const attestation = await service
    .from('account_device_attestations')
    .insert({
      user_id: userId,
      device_flag_id: flag.data.id,
      platform: 'ios',
      key_id_hash: digest(`key-${raw}`),
    })
    .select('id')
    .single();
  if (attestation.error || !attestation.data) throw attestation.error;
  const expires = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const session = await service.rpc('create_attested_installation_session', {
    target_user: userId,
    target_attestation: attestation.data.id,
    target_token_hash: digest(raw),
    target_expires_at: expires,
  });
  if (session.error) throw session.error;
  return raw;
}

async function makeDraw(
  ownerId,
  date,
  humanNumber,
  portraitStatus = 'approved'
) {
  const draw = await service
    .from('daily_draws')
    .insert({
      selection_date: date,
      candidate_pool_hash: 'a'.repeat(64),
      candidate_count: 1,
      random_seed: 'b'.repeat(64),
      selected_user_id: ownerId,
      selection_status:
        portraitStatus === 'approved' ? 'completed' : 'content_review',
      published_at:
        portraitStatus === 'approved' ? new Date().toISOString() : null,
      human_number: portraitStatus === 'approved' ? humanNumber : null,
    })
    .select('id')
    .single();
  if (draw.error) throw draw.error;
  drawIds.push(draw.data.id);

  const portrait = await service
    .from('portraits')
    .insert({
      draw_id: draw.data.id,
      user_id: ownerId,
      status: 'draft',
      photo_path: `${ownerId}/${draw.data.id}.jpg`,
    })
    .select('id')
    .single();
  if (portrait.error) throw portrait.error;

  const element = await service.from('portrait_elements').insert({
    portrait_id: portrait.data.id,
    element_key: 'introduction',
    answer: `A complete response from ${ownerId.slice(0, 8)}.`,
  });
  if (element.error) throw element.error;

  const finalized = await service
    .from('portraits')
    .update({
      status: portraitStatus,
      submitted_at: new Date().toISOString(),
      ...(portraitStatus === 'approved'
        ? { reviewed_at: new Date().toISOString() }
        : {}),
    })
    .eq('id', portrait.data.id);
  if (finalized.error) throw finalized.error;
  return { drawId: draw.data.id, portraitId: portrait.data.id };
}

async function rpc(client, name, args = {}) {
  const result = await client.rpc(name, args);
  if (result.error) throw result.error;
  return result.data;
}

async function cleanup() {
  if (drawIds.length > 0) {
    await service.from('daily_draws').delete().in('id', drawIds);
  }
  for (const id of users) {
    await service.auth.admin.deleteUser(id);
  }
  if (deviceFlagIds.length > 0) {
    await service.from('device_binding_flags').delete().in('id', deviceFlagIds);
  }
}

console.log(`Phase 2 safety/privacy verification against ${label}`);
try {
  const subject = await makeUser('Subject');
  const human = await makeUser('Human');
  const reporter = await makeUser('Reporter');
  const moderator = await makeUser('Moderator A');
  const secondModerator = await makeUser('Moderator B');

  const moderatorRows = await service
    .from('moderators')
    .insert([{ user_id: moderator.id }, { user_id: secondModerator.id }]);
  if (moderatorRows.error) throw moderatorRows.error;

  const questionDay = await makeDraw(subject.id, '2040-01-01', 900001);
  const portraitDay = await makeDraw(human.id, '2040-01-02', 900002);
  const removalDay = await makeDraw(human.id, '2040-01-03', 900003);
  await makeDraw(human.id, '2040-01-04', 900004, 'submitted');

  const question = await service
    .from('questions')
    .insert({
      draw_id: questionDay.drawId,
      author_id: subject.id,
      body: 'What memory still feels close to you today?',
      status: 'approved',
    })
    .select('id, body')
    .single();
  if (question.error) throw question.error;

  await rpc(reporter.client, 'block_content_author', {
    target_type: 'question',
    target_id: question.data.id,
  });
  const blocked = await rpc(reporter.client, 'my_blocked_users');
  check(
    blocked.length === 1 && blocked[0].block_id && !blocked[0].blocked_id,
    'content-target block returns an opaque management id'
  );

  await rpc(reporter.client, 'report_content', {
    report_target_type: 'question',
    report_target_id: question.data.id,
    report_reason: 'harassment',
  });
  const reportQueue = await rpc(moderator.client, 'moderation_report_queue');
  const questionReport = reportQueue.find(
    (item) => item.target_content === question.data.body
  );
  check(
    questionReport?.target_content === question.data.body,
    'report queue contains the exact reported question'
  );
  await rpc(moderator.client, 'resolve_report_v2', {
    target_report: questionReport.report_id,
    actions: ['remove_content'],
    resolution_note: 'Integration verification',
  });
  const removedQuestion = await service
    .from('questions')
    .select('status')
    .eq('id', question.data.id)
    .single();
  check(
    removedQuestion.data?.status === 'rejected',
    'remove-content report rejects an already-approved question'
  );

  await rpc(reporter.client, 'report_content', {
    report_target_type: 'portrait',
    report_target_id: portraitDay.portraitId,
    report_reason: 'impersonation',
  });
  const portraitReports = await rpc(
    moderator.client,
    'moderation_report_queue'
  );
  const portraitReport = portraitReports.find(
    (item) => item.target_id === portraitDay.portraitId
  );
  check(
    portraitReport?.target_photo_path?.endsWith('.jpg'),
    'report queue contains the reported photograph path'
  );
  await rpc(moderator.client, 'resolve_report_v2', {
    target_report: portraitReport.report_id,
    actions: ['remove_content'],
    resolution_note: 'Integration verification',
  });
  const redacted = await service
    .from('daily_draws')
    .select('redacted_at')
    .eq('id', portraitDay.drawId)
    .single();
  check(
    Boolean(redacted.data?.redacted_at),
    'removing a published portrait creates an Archive tombstone'
  );

  const portraitQueue = await rpc(
    moderator.client,
    'moderation_portrait_queue'
  );
  check(
    portraitQueue.some(
      (item) =>
        item.photo_path &&
        Array.isArray(item.responses) &&
        item.responses.length === 1
    ),
    'portrait queue contains the photograph and every response'
  );

  await rpc(human.client, 'request_archive_removal', {
    target_draw: removalDay.drawId,
    request_reason: 'I want my story removed.',
  });
  const removals = await rpc(
    secondModerator.client,
    'moderation_archive_removal_queue'
  );
  await rpc(secondModerator.client, 'review_archive_removal', {
    target_request: removals[0].request_id,
    approved: true,
  });
  const removalResult = await service
    .from('daily_draws')
    .select('redacted_at')
    .eq('id', removalDay.drawId)
    .single();
  check(
    Boolean(removalResult.data?.redacted_at),
    'independent Archive-removal request redacts the published story'
  );

  await rpc(moderator.client, 'set_account_status', {
    target_user: subject.id,
    new_status: 'suspended',
    status_reason: 'Integration verification',
  });
  const decisions = await rpc(subject.client, 'my_appealable_decisions');
  const event = decisions.find((item) => item.action === 'account_suspended');
  await rpc(subject.client, 'submit_moderation_appeal', {
    target_event: event.event_id,
    appeal_statement: 'Please have another moderator review this decision.',
  });
  const appeals = await rpc(secondModerator.client, 'moderation_appeal_queue');
  const originalAttempt = await moderator.client.rpc(
    'review_moderation_appeal',
    {
      target_appeal: appeals[0].appeal_id,
      overturned: true,
    }
  );
  check(
    Boolean(originalAttempt.error),
    'the original moderator cannot decide the appeal'
  );
  await rpc(secondModerator.client, 'review_moderation_appeal', {
    target_appeal: appeals[0].appeal_id,
    overturned: true,
    review_note: 'Second review complete',
  });
  const restored = await service
    .from('profiles')
    .select('account_status')
    .eq('id', subject.id)
    .single();
  check(
    restored.data?.account_status === 'active',
    'a second moderator can overturn and restore the account'
  );

  const installationToken = await createInstallationSession(subject.id);
  await rpc(subject.client, 'register_push_token', {
    push_token: `ExponentPushToken[phase2-${randomUUID()}]`,
    device_platform: 'ios',
    installation_token: installationToken,
  });
  const removedTokens = await rpc(subject.client, 'unregister_my_push_tokens');
  check(removedTokens === 1, 'sign-out cleanup removes every push token');

  const exported = await rpc(subject.client, 'export_my_data');
  check(
    exported.schema_version === 3 &&
      Array.isArray(exported.questions_authored) &&
      Array.isArray(exported.moderation_decisions_about_me),
    'download export contains content and safety history'
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  failures += 1;
} finally {
  await cleanup();
}

console.log(
  failures === 0
    ? 'Phase 2 backend effects verified.'
    : `${failures} check(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);
