import { AppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';

import { loadAppleModule } from './appleAuth';

/**
 * Very low friction, and no classic passwords.
 * Sign in with Apple first, email six-digit code second.
 */

export { isAppleAuthAvailable } from './appleAuth';

export async function signInWithApple(): Promise<void> {
  const apple = loadAppleModule();

  // Every caller checks availability first; this is the belt to that braces,
  // so a stray call on Android throws an AppError rather than a TypeError.
  if (!apple) {
    throw new AppError('auth', 'auth.appleUnavailable');
  }

  let credential: Awaited<ReturnType<typeof apple.signInAsync>>;

  try {
    credential = await apple.signInAsync({
      requestedScopes: [
        apple.AppleAuthenticationScope.FULL_NAME,
        apple.AppleAuthenticationScope.EMAIL,
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
 *
 * This path works everywhere — Expo Go and Android included — which is why it
 * is never hidden behind the Apple button.
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
  const supabase = getSupabase();
  const { error: unregisterError } = await supabase.rpc(
    'unregister_my_push_tokens'
  );
  if (unregisterError) {
    // Keep the session active so the person can retry; signing out while a
    // server token remains would allow private notifications on a shared phone.
    throw new AppError('auth', 'auth.signOutFailed', {
      cause: unregisterError,
    });
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new AppError('auth', 'auth.signOutFailed', { cause: error });
  }
}
