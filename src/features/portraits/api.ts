import * as Crypto from 'expo-crypto';

import { AppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import type { PortraitElementRow, PortraitRow } from '@/lib/supabase/types';

import { PORTRAIT_PROMPTS, type PortraitElementKey } from './prompts';

/**
 * The author's side of the portrait.
 *
 * Everything here works on a draft. Once submitted, the database refuses edits
 * outright — otherwise the text a moderator approved and the text published
 * could differ, which would make review theatre.
 */

export interface PortraitWithElements {
  portrait: PortraitRow;
  answers: Partial<Record<PortraitElementKey, string>>;
  revisions: Record<PortraitElementKey, number>;
  photoUrl: string | null;
}

export async function getMyPortrait(): Promise<PortraitWithElements | null> {
  const supabase = getSupabase();

  const { data: portrait, error } = await supabase
    .from('portraits')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }
  if (!portrait) {
    return null;
  }

  const { data: elements, error: elementsError } = await supabase
    .from('portrait_elements')
    .select('*')
    .eq('portrait_id', portrait.id);

  if (elementsError) {
    throw new AppError('network', 'common.error', { cause: elementsError });
  }

  const answers: Partial<Record<PortraitElementKey, string>> = {};
  for (const element of (elements ?? []) as PortraitElementRow[]) {
    answers[element.element_key] = element.answer;
  }

  const { data: revisionRows, error: revisionError } = await supabase.rpc(
    'get_my_portrait_answer_revisions',
    { target_portrait: portrait.id }
  );
  if (revisionError) {
    throw new AppError('network', 'common.error', { cause: revisionError });
  }
  const revisions = Object.fromEntries(
    PORTRAIT_PROMPTS.map((prompt) => [prompt.key, 0])
  ) as Record<PortraitElementKey, number>;
  for (const row of revisionRows ?? []) {
    revisions[row.element_key] = row.revision;
  }

  let photoUrl: string | null = null;
  if (portrait.photo_path) {
    const { data } = await supabase.storage
      .from('portraits')
      .createSignedUrl(portrait.photo_path, 3600);
    photoUrl = data?.signedUrl ?? null;
  }

  return { portrait, answers, revisions, photoUrl };
}

/**
 * Creates the draft, or returns the existing one. Returns null when the caller
 * has not accepted a selection — there is nothing to write a portrait for.
 */
export async function startMyPortrait(): Promise<string | null> {
  const { data, error } = await getSupabase().rpc('start_my_portrait');

  if (error) {
    throw new AppError('unknown', 'portrait.startFailed', { cause: error });
  }
  return data;
}

export async function saveAnswer(
  portraitId: string,
  key: PortraitElementKey,
  answer: string,
  expectedRevision: number
): Promise<number> {
  const { data, error } = await getSupabase().rpc('save_my_portrait_answer', {
    target_portrait: portraitId,
    target_key: key,
    target_answer: answer,
    expected_revision: expectedRevision,
  });

  if (error || typeof data !== 'number') {
    throw new AppError('validation', 'portrait.saveFailed', { cause: error });
  }
  return data;
}

/**
 * Uploads into a folder named after the user id, which is what makes "your own
 * files" expressible as a storage policy at all.
 */
export async function uploadPortraitPhoto(
  userId: string,
  portraitId: string,
  uri: string
): Promise<string> {
  const supabase = getSupabase();
  const response = await fetch(uri);
  const blob = await response.arrayBuffer();

  if (blob.byteLength < 1 || blob.byteLength > 8 * 1024 * 1024) {
    throw new AppError('validation', 'portrait.uploadFailed');
  }

  const path = `${userId}/${portraitId}/photo/${Crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage
    .from('portraits')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });

  if (error) {
    throw new AppError('unknown', 'portrait.uploadFailed', { cause: error });
  }

  const { data, error: updateError } = await supabase.functions.invoke(
    'register-portrait-photo',
    { body: { portraitId, objectPath: path } }
  );

  if (updateError || data?.path !== path) {
    // The Edge endpoint also attempts this cleanup. The client repeats it so a
    // transport failure cannot turn the just-uploaded object into an orphan.
    await supabase.storage.from('portraits').remove([path]);
    throw new AppError('unknown', 'portrait.uploadFailed', {
      cause: updateError,
    });
  }

  return path;
}

export async function saveAnswersAndSubmitMyPortrait(
  portraitId: string,
  answers: Partial<Record<PortraitElementKey, string>>,
  revisions: Record<PortraitElementKey, number>
): Promise<void> {
  const submittedAnswers = Object.fromEntries(
    PORTRAIT_PROMPTS.map((prompt) => [prompt.key, answers[prompt.key] ?? ''])
  );
  const { data, error } = await getSupabase().rpc(
    'save_answers_and_submit_my_portrait',
    {
      target_portrait: portraitId,
      submitted_answers: submittedAnswers,
      expected_revisions: revisions,
    }
  );

  if (error) {
    throw new AppError('validation', 'portrait.submitFailed', { cause: error });
  }
  if (!data) {
    throw new AppError('validation', 'portrait.submitFailed');
  }
}

export async function acceptCommunityRules(): Promise<void> {
  const { error } = await getSupabase().rpc('accept_community_rules');

  if (error) {
    throw new AppError('unknown', 'rules.acceptFailed', { cause: error });
  }
}
