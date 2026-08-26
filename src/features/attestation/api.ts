import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { isExpoGo } from '@/features/notifications/push';
import { setAnalyticsSessionToken } from '@/lib/analytics/session';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';

import { loadDeviceCheckModule } from './deviceCheck';

type AppIntegrityModule = typeof import('@expo/app-integrity');

interface Challenge {
  challengeId: string;
  challenge: string;
  expiresAt: string;
}

interface VerificationResult {
  verified: true;
  reviewPending: boolean;
  analyticsSessionToken: string;
  analyticsSessionExpiresAt: string;
}

export type AttestationOutcome =
  | { state: 'verified' }
  | { state: 'review-required' }
  | { state: 'development' }
  | { state: 'unsupported' };

const IOS_KEY_PREFIX = 'unumae.app_attest_key.';
const ANDROID_KEY_PREFIX = 'unumae.play_integrity_installation.';

function loadAppIntegrity(): AppIntegrityModule | null {
  if (Platform.OS === 'web' || isExpoGo) return null;
  try {
    // Native module is absent from older binaries, which remain usable but are
    // never considered attested.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@expo/app-integrity') as AppIntegrityModule;
  } catch {
    return null;
  }
}

async function invokeAttestation<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke(
    'device-attestation',
    { body }
  );
  let responseData = data as Record<string, unknown> | null;
  if (error && 'context' in error && error.context instanceof Response) {
    responseData = (await error.context.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
  }
  if (typeof responseData?.error === 'string') {
    const retryable = [
      'provider_unavailable',
      'challenge_write_failed',
      'server_misconfigured',
    ].includes(responseData.error);
    throw new AppError(
      retryable ? 'network' : 'permission',
      retryable ? 'attestation.retryable' : 'attestation.rejected',
      { cause: error }
    );
  }
  if (error || !responseData) {
    throw new AppError('network', 'attestation.retryable', { cause: error });
  }
  return responseData as T;
}

async function challenge(platform: 'ios' | 'android'): Promise<Challenge> {
  return invokeAttestation<Challenge>({ action: 'challenge', platform });
}

async function verifyIos(
  integrity: AppIntegrityModule,
  userId: string
): Promise<VerificationResult> {
  const deviceCheck = loadDeviceCheckModule();
  if (!integrity.isSupported || !deviceCheck?.isSupported) {
    throw new AppError('permission', 'attestation.unsupported');
  }

  const keyName = `${IOS_KEY_PREFIX}${userId}`;
  let keyId = await SecureStore.getItemAsync(keyName);
  if (!keyId) {
    keyId = await integrity.generateKeyAsync();
    await SecureStore.setItemAsync(keyName, keyId);
  }

  const issued = await challenge('ios');
  try {
    const [attestation, deviceToken] = await Promise.all([
      integrity.attestKeyAsync(keyId, issued.challenge),
      deviceCheck.generateTokenAsync(),
    ]);
    return await invokeAttestation<VerificationResult>({
      action: 'verify',
      platform: 'ios',
      challengeId: issued.challengeId,
      challenge: issued.challenge,
      evidence: {
        kind: 'ios-app-attest',
        keyId,
        attestation,
        deviceToken,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      if (error.kind !== 'network') {
        await SecureStore.deleteItemAsync(keyName).catch(() => undefined);
      }
      throw error;
    }
    const message = error instanceof Error ? error.message : '';
    if (!message.includes('SERVER_UNAVAILABLE')) {
      await SecureStore.deleteItemAsync(keyName).catch(() => undefined);
    }
    throw error;
  }
}

async function verifyAndroid(
  integrity: AppIntegrityModule,
  userId: string
): Promise<VerificationResult> {
  if (!env.googleCloudProjectNumber) {
    throw new AppError('unknown', 'attestation.retryable');
  }
  const keyName = `${ANDROID_KEY_PREFIX}${userId}`;
  let keyId = await SecureStore.getItemAsync(keyName);
  if (!keyId) {
    keyId = Crypto.randomUUID();
    await SecureStore.setItemAsync(keyName, keyId);
  }

  const issued = await challenge('android');
  await integrity.prepareIntegrityTokenProviderAsync(
    env.googleCloudProjectNumber
  );
  let integrityToken: string;
  try {
    integrityToken = await integrity.requestIntegrityCheckAsync(
      issued.challenge
    );
  } catch {
    // Providers expire. One fresh preparation is bounded and safe to retry.
    await integrity.prepareIntegrityTokenProviderAsync(
      env.googleCloudProjectNumber
    );
    integrityToken = await integrity.requestIntegrityCheckAsync(
      issued.challenge
    );
  }
  return invokeAttestation<VerificationResult>({
    action: 'verify',
    platform: 'android',
    challengeId: issued.challengeId,
    challenge: issued.challenge,
    evidence: {
      kind: 'android-play-integrity',
      keyId,
      integrityToken,
    },
  });
}

export async function attestCurrentDevice(
  userId: string
): Promise<AttestationOutcome> {
  if (Platform.OS === 'web' || isExpoGo || !Device.isDevice) {
    return { state: 'development' };
  }
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return { state: 'unsupported' };
  }
  const integrity = loadAppIntegrity();
  if (!integrity) return { state: 'unsupported' };

  try {
    const result =
      Platform.OS === 'ios'
        ? await verifyIos(integrity, userId)
        : await verifyAndroid(integrity, userId);
    await setAnalyticsSessionToken(result.analyticsSessionToken);
    return { state: result.reviewPending ? 'review-required' : 'verified' };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('unknown', 'attestation.rejected', { cause: error });
  }
}

/**
 * Client half of App Attest assertions for sensitive, challenge-bound calls.
 * The caller must obtain a fresh server challenge and send both fields to the
 * server verifier; this function never treats a locally generated assertion as
 * proof by itself.
 */
export async function generateIosAppAssertion(
  userId: string,
  serverChallenge: string
): Promise<{ keyId: string; assertion: string }> {
  if (Platform.OS !== 'ios' || serverChallenge.length < 16) {
    throw new AppError('validation', 'attestation.unsupported');
  }
  const integrity = loadAppIntegrity();
  const keyId = await SecureStore.getItemAsync(`${IOS_KEY_PREFIX}${userId}`);
  if (!integrity || !keyId || !integrity.isSupported) {
    throw new AppError('permission', 'attestation.unsupported');
  }
  return {
    keyId,
    assertion: await integrity.generateAssertionAsync(keyId, serverChallenge),
  };
}

export async function requestAttestationReview(): Promise<void> {
  const { data, error } = await getSupabase().rpc('request_attestation_review');
  if (error || typeof data !== 'string') {
    throw new AppError('unknown', 'attestation.reviewFailed', { cause: error });
  }
}
