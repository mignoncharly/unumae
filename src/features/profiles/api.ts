import * as Crypto from 'expo-crypto';

import { AppError } from '@/lib/errors';
import { queryPersister } from '@/lib/offline/persist';
import { getSupabase } from '@/lib/supabase';
import type {
  DeletionRequestRow,
  DeletionRequestState,
  ProfileRow,
} from '@/lib/supabase/types';

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
export interface DeletionAccepted {
  accepted: true;
  state: DeletionRequestState;
  correlationId: string;
  requestedAt: string;
  wasPublished: boolean;
}

export async function deleteMyAccount(): Promise<DeletionAccepted> {
  const { data, error } = await getSupabase().functions.invoke(
    'delete-account',
    {
      method: 'POST',
      body: { idempotencyKey: Crypto.randomUUID() },
    }
  );

  if (error || data?.accepted !== true) {
    throw new AppError('unknown', 'settings.deleteFailed', { cause: error });
  }

  return data as DeletionAccepted;
}

export async function getMyDeletionRequest(): Promise<DeletionRequestRow | null> {
  const { data, error } = await getSupabase().rpc('my_deletion_request');

  if (error) {
    throw new AppError('network', 'deletion.statusFailed', {
      cause: error,
    });
  }
  return data?.[0] ?? null;
}

export async function finishDeletedAccountSession(): Promise<void> {
  await queryPersister.removeClient();
  const { error } = await getSupabase().auth.signOut({ scope: 'local' });
  if (error) {
    throw new AppError('auth', 'auth.signOutFailed', { cause: error });
  }
}

export async function sendDeletionReauthenticationCode(
  email: string
): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });

  if (error) {
    throw new AppError('auth', 'auth.emailFailed', { cause: error });
  }
}

export async function verifyDeletionReauthenticationCode(
  email: string,
  token: string
): Promise<void> {
  const { error } = await getSupabase().auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) {
    throw new AppError('auth', 'auth.codeInvalid', { cause: error });
  }
}

/**
 * Whether you joined during Year Zero.
 *
 * A badge and nothing else. It carries no advantage in the draw — see
 * supabase/migrations/20260823070000_founding_and_retention.sql, where it is
 * derived from your join date rather than stored, so there is no field anyone
 * could grant, revoke or weigh.
 */
export async function amIFounding(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('am_i_founding');
  // Not knowing is the same as no badge. It is decoration; failing the screen
  // over it would be absurd.
  return error ? false : (data ?? false);
}
