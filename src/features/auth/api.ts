import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import { AppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';

/**
 * Article 1.3 of the plan: very low friction, and no classic passwords.
 * Sign in with Apple first, email magic link second.
 */

export async function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }
  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithApple(): Promise<void> {
  let credential: AppleAuthentication.AppleAuthenticationCredential;

  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (error) {
    // The user closing the sheet is not an error worth showing them.
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'ERR_REQUEST_CANCELED'
    ) {
      throw new AppError('auth', 'auth.cancelled', { cause: error });
    }
    throw new AppError('auth', 'auth.appleFailed', { cause: error });
  }

  if (!credential.identityToken) {
    throw new AppError('auth', 'auth.appleFailed');
  }

  const { error } = await getSupabase().auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) {
    throw new AppError('auth', 'auth.appleFailed', { cause: error });
  }
}

/**
 * Sends a six-digit code. A code rather than a link because a link opens in
 * whichever browser the mail app prefers, which breaks the session handoff on
 * iOS often enough to be a support burden.
 */
export async function sendEmailCode(email: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) {
    throw new AppError('auth', 'auth.emailFailed', { cause: error });
  }
}

export async function verifyEmailCode(
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

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) {
    throw new AppError('auth', 'common.error', { cause: error });
  }
}
