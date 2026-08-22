import { AppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import type { ProfileRow } from '@/lib/supabase/types';

import type { CreateProfileInput, UpdateProfileInput } from './schema';

/**
 * A user has no profile until onboarding completes. `null` is a normal answer,
 * not an error — it is what tells the app to show onboarding.
 */
export async function getMyProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }

  return data;
}

export async function createMyProfile(
  userId: string,
  input: CreateProfileInput
): Promise<ProfileRow> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .insert({ id: userId, ...input })
    .select('*')
    .single();

  if (error) {
    // 23505 is a unique violation, which here can only be the username.
    if (error.code === '23505') {
      throw new AppError('validation', 'profile.usernameTaken', {
        cause: error,
      });
    }
    throw new AppError('validation', 'profile.saveFailed', { cause: error });
  }

  return data;
}

export async function updateMyProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<ProfileRow> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .update(input)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new AppError('validation', 'profile.usernameTaken', {
        cause: error,
      });
    }
    throw new AppError('validation', 'profile.saveFailed', { cause: error });
  }

  return data;
}

/**
 * Deletes the account and everything that cascades from it (Article 8.2).
 *
 * Deletion needs privileges the client must never hold, so it runs in an Edge
 * Function under the service role. Phase 9 ships that function; this is the
 * client half, and it fails loudly rather than pretending to succeed.
 */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await getSupabase().functions.invoke('delete-account', {
    method: 'POST',
  });

  if (error) {
    throw new AppError('unknown', 'settings.deleteFailed', { cause: error });
  }

  await getSupabase().auth.signOut();
}
