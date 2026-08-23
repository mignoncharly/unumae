import { AppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import type { PortraitElementRow, PortraitRow } from '@/lib/supabase/types';

import type { PortraitElementKey } from './prompts';

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

  let photoUrl: string | null = null;
  if (portrait.photo_path) {
    const { data } = await supabase.storage
      .from('portraits')
      .createSignedUrl(portrait.photo_path, 3600);
    photoUrl = data?.signedUrl ?? null;
  }

  return { portrait, answers, photoUrl };
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
  answer: string
): Promise<void> {
  const trimmed = answer.trim();

  // Clearing an answer removes the row rather than storing an empty string:
  // an unanswered prompt is absent, not blank.
  if (trimmed.length === 0) {
    const { error } = await getSupabase()
      .from('portrait_elements')
      .delete()
      .eq('portrait_id', portraitId)
      .eq('element_key', key);

    if (error) {
      throw new AppError('validation', 'portrait.saveFailed', { cause: error });
    }
    return;
  }

  const { error } = await getSupabase()
    .from('portrait_elements')
    .upsert(
      { portrait_id: portraitId, element_key: key, answer: trimmed },
      { onConflict: 'portrait_id,element_key' }
    );

  if (error) {
    throw new AppError('validation', 'portrait.saveFailed', { cause: error });
  }
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

  const extension = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${userId}/${portraitId}/photo.${extension}`;

  const { error } = await supabase.storage
    .from('portraits')
    .upload(path, blob, { contentType: `image/${extension}`, upsert: true });

  if (error) {
    throw new AppError('unknown', 'portrait.uploadFailed', { cause: error });
  }

  const { error: updateError } = await supabase
    .from('portraits')
    .update({ photo_path: path })
    .eq('id', portraitId);

  if (updateError) {
    throw new AppError('unknown', 'portrait.uploadFailed', {
      cause: updateError,
    });
  }

  return path;
}

export async function submitMyPortrait(): Promise<void> {
  const { data, error } = await getSupabase().rpc('submit_my_portrait');

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
