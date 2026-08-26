import type { PortraitElementKey } from '@/features/portraits/prompts';
import { AppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import type {
  PublicQuestionRow,
  QuestionTranslationRow,
  TodaysHumanRow,
} from '@/lib/supabase/types';

/**
 * Today's Human, as a guest sees it.
 *
 * Everything here goes through a database function rather than a table read.
 * `profiles` and `portraits` stay owner-only even after publication — going
 * live exposes one carefully chosen row, not a table.
 */

export interface TodaysHuman {
  human: TodaysHumanRow;
  elements: { key: PortraitElementKey; answer: string }[];
  photoUrl: string | null;
}

/** Signed for an hour. The bucket is private; the object becomes readable only
 * once its cycle is live, which is enforced by a storage policy. */
async function signPhoto(path: string | null): Promise<string | null> {
  if (!path) {
    return null;
  }

  const { data, error } = await getSupabase()
    .storage.from('portraits')
    .createSignedUrl(path, 3600);

  // A missing photograph is not worth failing the whole screen for.
  return error ? null : (data?.signedUrl ?? null);
}

/**
 * The portrait's answers for any published cycle. Shared with the Archive, so
 * a Human reads identically on their day and forever afterwards.
 */
export async function getPortraitElements(
  drawId: string
): Promise<{ key: PortraitElementKey; answer: string }[]> {
  const { data, error } = await getSupabase().rpc('get_portrait_elements', {
    target_draw: drawId,
  });

  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }

  return (data ?? []).map((element) => ({
    key: element.element_key as PortraitElementKey,
    answer: element.answer,
  }));
}

export async function getTodaysHuman(): Promise<TodaysHuman | null> {
  const { data, error } = await getSupabase().rpc('get_todays_human');
  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }

  const human = data?.[0];
  if (!human) {
    // No live cycle. Either the day has not started or it is a Quiet Day —
    // the caller decides which message that deserves.
    return null;
  }

  if (human.is_removed) {
    return { human, elements: [], photoUrl: null };
  }

  if (!human.portrait_id || !human.display_name || !human.country_code) {
    throw new AppError('validation', 'today.malformed');
  }

  return {
    human,
    elements: await getPortraitElements(human.draw_id),
    photoUrl: await signPhoto(human.photo_path),
  };
}

export async function getQuestions(
  drawId: string
): Promise<PublicQuestionRow[]> {
  const { data, error } = await getSupabase().rpc('get_questions', {
    target_draw: drawId,
  });

  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }
  return data ?? [];
}

export async function askQuestion(
  drawId: string,
  body: string
): Promise<string> {
  const { data, error } = await getSupabase().rpc('ask_question', {
    target_draw: drawId,
    question_body: body.trim(),
  });

  if (error) {
    throw new AppError('validation', 'questions.askFailed', { cause: error });
  }
  return data;
}

/** Adding or removing your own upvote. There is no third option. */
export async function setVote(
  questionId: string,
  voted: boolean
): Promise<void> {
  const { data, error } = await getSupabase().rpc(
    voted ? 'vote_question' : 'unvote_question',
    { target_question: questionId }
  );

  if (error || !data) {
    throw new AppError('unknown', 'questions.voteFailed', { cause: error });
  }
}

export async function setRemembered(
  drawId: string,
  remembered: boolean
): Promise<void> {
  const { data, error } = await getSupabase().rpc(
    remembered ? 'remember_human' : 'forget_human',
    { target_draw: drawId }
  );

  if (error || !data) {
    throw new AppError('unknown', 'remember.failed', { cause: error });
  }
}

export async function doIRemember(drawId: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('do_i_remember', {
    target_draw: drawId,
  });

  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }
  return data ?? false;
}

/**
 * Translations of a published portrait, keyed by element.
 *
 * Returned separately from the original on purpose: there is no code path that
 * can substitute one for the other, because they come from different functions
 * (Article 9.6).
 */
export async function getPortraitTranslations(
  drawId: string,
  locale: string
): Promise<Record<string, string>> {
  const { data, error } = await getSupabase().rpc('get_portrait_translations', {
    target_draw: drawId,
    target_locale: locale,
  });

  // A missing translation is not worth failing a screen for: the original is
  // always there.
  if (error) {
    return {};
  }

  return Object.fromEntries(
    (data ?? []).map((row) => [row.element_key, row.translated_text])
  );
}

export async function getQuestionTranslations(
  drawId: string,
  locale: string
): Promise<Record<string, QuestionTranslationRow>> {
  const { data, error } = await getSupabase().rpc('get_question_translations', {
    target_draw: drawId,
    target_locale: locale,
  });
  if (error) return {};
  return Object.fromEntries((data ?? []).map((row) => [row.question_id, row]));
}
