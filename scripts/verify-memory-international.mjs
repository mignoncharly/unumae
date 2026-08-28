#!/usr/bin/env node
/** Phase 3 effects against local Supabase, or live with `--live`; self-cleaning. */
import { randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import { loadVerificationTarget } from './lib/verification-target.mjs';

const { url, publicKey, secretKey, label } = loadVerificationTarget();

const service = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const guest = createClient(url, publicKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const userIds = [];
const drawIds = [];
let failures = 0;

function check(value, label) {
  const passed = Boolean(value);
  console.log(`  ${passed ? 'ok  ' : 'FAIL'}  ${label}`);
  if (!passed) failures += 1;
}

async function makeUser(label, includeSelectionChoice = true) {
  const email = `phase3-${randomUUID()}@example.com`;
  const password = `${randomUUID()}Aa1!`;
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) throw created.error;
  userIds.push(created.data.user.id);
  const client = createClient(url, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  const profile = await client
    .from('profiles')
    .insert({
      id: created.data.user.id,
      username: `p3_${randomUUID().replaceAll('-', '').slice(0, 12)}`,
      display_name: label,
      birth_year: 1990,
      country_code: 'DE',
      languages: ['en', 'de'],
      locale: 'de',
      ...(includeSelectionChoice ? { wants_selection: false } : {}),
    })
    .select('wants_selection, locale')
    .single();
  if (profile.error) throw profile.error;
  return { id: created.data.user.id, client, profile: profile.data };
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
  for (const id of userIds) await service.auth.admin.deleteUser(id);
}

console.log(`Phase 3 memory/international verification against ${label}`);
try {
  const owner = await makeUser('Archive Human');
  const reader = await makeUser('Reader', false);
  check(
    owner.profile.wants_selection === false &&
      reader.profile.wants_selection === false,
    'selection participation is an explicit, safe false by default'
  );
  check(reader.profile.locale === 'de', 'profile locale is client writable');

  const existingDraws = await service
    .from('daily_draws')
    .select('selection_date')
    .order('selection_date', { ascending: true });
  if (existingDraws.error) throw existingDraws.error;
  const usedDates = new Set(
    (existingDraws.data ?? []).map((row) => row.selection_date)
  );
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const fixtureDate = new Date(Date.UTC(2000, 0, 1));
  while (usedDates.has(fixtureDate.toISOString().slice(0, 10))) {
    fixtureDate.setUTCDate(fixtureDate.getUTCDate() + 1);
  }
  const archiveDate = usedDates.has(yesterday)
    ? fixtureDate.toISOString().slice(0, 10)
    : yesterday;
  const draw = await service
    .from('daily_draws')
    .insert({
      selection_date: archiveDate,
      candidate_pool_hash: 'a'.repeat(64),
      candidate_count: 1,
      random_seed: 'b'.repeat(64),
      selected_user_id: owner.id,
      selection_status: 'completed',
      published_at: new Date().toISOString(),
      human_number: 930001,
    })
    .select('id')
    .single();
  if (draw.error) throw draw.error;
  drawIds.push(draw.data.id);

  const portrait = await service
    .from('portraits')
    .insert({
      draw_id: draw.data.id,
      user_id: owner.id,
      status: 'draft',
      photo_path: `${owner.id}/${draw.data.id}.jpg`,
    })
    .select('id')
    .single();
  if (portrait.error) throw portrait.error;
  const element = await service.from('portrait_elements').insert({
    portrait_id: portrait.data.id,
    element_key: 'introduction',
    answer: 'My original words remain.',
  });
  if (element.error) throw element.error;
  const approved = await service
    .from('portraits')
    .update({
      status: 'approved',
      submitted_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', portrait.data.id);
  if (approved.error) throw approved.error;

  await rpc(reader.client, 'remember_human', { target_draw: draw.data.id });
  const remembered = await rpc(reader.client, 'get_remembered_humans', {
    page_limit: 10,
    before_remembered_at: null,
    before_draw: null,
  });
  check(
    remembered.length === 1 && remembered[0].draw_id === draw.data.id,
    'Remembered Humans is a private, usable library'
  );
  const guestRemembered = await guest.rpc('get_remembered_humans', {
    page_limit: 10,
  });
  check(
    Boolean(guestRemembered.error),
    'anonymous readers cannot open a library'
  );

  const archive = await rpc(guest, 'get_archive_page', {
    filter_country: null,
    filter_year: null,
    page_limit: 1,
    before_date: null,
    before_draw: null,
  });
  const afterCursor = await rpc(guest, 'get_archive_page', {
    filter_country: null,
    filter_year: null,
    page_limit: 1,
    before_date: archive[0].selection_date,
    before_draw: archive[0].draw_id,
  });
  check(
    archive.length === 1 && afterCursor.length === 0,
    'Archive cursor reaches a stable end without duplicates'
  );
  const yesterdayHuman = await rpc(guest, 'get_yesterdays_human');
  const yesterdayOccupied = usedDates.has(yesterday);
  check(
    yesterdayOccupied || yesterdayHuman[0]?.draw_id === draw.data.id,
    yesterdayOccupied
      ? 'Yesterday path remains readable alongside existing hosted history'
      : 'Yesterday is an explicit Archive path'
  );

  const question = await service
    .from('questions')
    .insert({
      draw_id: draw.data.id,
      author_id: reader.id,
      body: 'What should the world remember?',
      status: 'approved',
    })
    .select('id')
    .single();
  if (question.error) throw question.error;
  await rpc(service, 'record_translation', {
    target_portrait: portrait.data.id,
    target_element: 'introduction',
    target_locale: 'de',
    text_value: 'Meine ursprünglichen Worte bleiben.',
    translation_engine: 'phase3-verification',
  });
  await rpc(service, 'record_question_translation', {
    target_question: question.data.id,
    target_field: 'body',
    target_locale: 'de',
    text_value: 'Woran soll sich die Welt erinnern?',
    translation_engine: 'phase3-verification',
  });
  const portraitTranslations = await rpc(guest, 'get_portrait_translations', {
    target_draw: draw.data.id,
    target_locale: 'de',
  });
  const questionTranslations = await rpc(guest, 'get_question_translations', {
    target_draw: draw.data.id,
    target_locale: 'de',
  });
  check(
    portraitTranslations[0]?.translated_text.includes('Worte') &&
      questionTranslations[0]?.translated_body.includes('Welt'),
    'portrait and question translations are additive and readable'
  );

  const exported = await rpc(reader.client, 'export_my_data');
  check(
    exported.schema_version === 3 &&
      Array.isArray(exported.question_translations),
    'personal-data export includes Phase 3 translation data'
  );

  await service
    .from('daily_draws')
    .update({ redacted_at: new Date().toISOString() })
    .eq('id', draw.data.id);
  const hiddenPortrait = await rpc(guest, 'get_portrait_translations', {
    target_draw: draw.data.id,
    target_locale: 'de',
  });
  const hiddenQuestions = await rpc(guest, 'get_question_translations', {
    target_draw: draw.data.id,
    target_locale: 'de',
  });
  check(
    hiddenPortrait.length === 0 && hiddenQuestions.length === 0,
    'redaction hides every translated copy with the original'
  );
} catch (error) {
  console.error(error);
  failures += 1;
} finally {
  await cleanup();
}

if (failures > 0) process.exit(1);
console.log('Phase 3 verification passed.');
