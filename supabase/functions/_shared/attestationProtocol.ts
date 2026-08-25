export type AttestationPlatform = 'ios' | 'android';

export interface ChallengeRequest {
  action: 'challenge';
  platform: AttestationPlatform;
}

export interface VerificationRequest {
  action: 'verify';
  platform: AttestationPlatform;
  challengeId: string;
  challenge: string;
  evidence: IosEvidence | AndroidEvidence;
}

export interface IosEvidence {
  kind: 'ios-app-attest';
  keyId: string;
  attestation: string;
  deviceToken: string;
}

export interface AndroidEvidence {
  kind: 'android-play-integrity';
  keyId: string;
  integrityToken: string;
}

export interface VerifiedPlatformEvidence {
  bindingMaterial: string;
  keyMaterial: string;
  publicKey: string | null;
  providerReportsBound: boolean;
  bindProviderFlag: () => Promise<boolean>;
}

export interface PlatformVerifier {
  verify(request: VerificationRequest): Promise<VerifiedPlatformEvidence>;
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BASE64ISH = /^[A-Za-z0-9+/_=-]+$/;
const CHALLENGE = /^[A-Za-z0-9_-]{43}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedString(
  value: unknown,
  minimum: number,
  maximum: number,
  pattern = BASE64ISH
): value is string {
  return (
    typeof value === 'string' &&
    value.length >= minimum &&
    value.length <= maximum &&
    pattern.test(value)
  );
}

export function parseAttestationRequest(
  value: unknown
): ChallengeRequest | VerificationRequest | null {
  if (!isRecord(value)) return null;
  if (
    value.action === 'challenge' &&
    (value.platform === 'ios' || value.platform === 'android')
  ) {
    return { action: 'challenge', platform: value.platform };
  }
  if (
    value.action !== 'verify' ||
    (value.platform !== 'ios' && value.platform !== 'android') ||
    typeof value.challengeId !== 'string' ||
    !UUID.test(value.challengeId) ||
    !boundedString(value.challenge, 43, 43, CHALLENGE) ||
    !isRecord(value.evidence)
  ) {
    return null;
  }

  const evidence = value.evidence;
  if (
    value.platform === 'ios' &&
    evidence.kind === 'ios-app-attest' &&
    boundedString(evidence.keyId, 16, 512) &&
    boundedString(evidence.attestation, 64, 32_768) &&
    boundedString(evidence.deviceToken, 16, 8_192)
  ) {
    return {
      action: 'verify',
      platform: 'ios',
      challengeId: value.challengeId,
      challenge: value.challenge,
      evidence: {
        kind: 'ios-app-attest',
        keyId: evidence.keyId,
        attestation: evidence.attestation,
        deviceToken: evidence.deviceToken,
      },
    };
  }

  if (
    value.platform === 'android' &&
    evidence.kind === 'android-play-integrity' &&
    boundedString(evidence.keyId, 16, 512) &&
    boundedString(evidence.integrityToken, 64, 32_768)
  ) {
    return {
      action: 'verify',
      platform: 'android',
      challengeId: value.challengeId,
      challenge: value.challenge,
      evidence: {
        kind: 'android-play-integrity',
        keyId: evidence.keyId,
        integrityToken: evidence.integrityToken,
      },
    };
  }
  return null;
}

export function randomChallenge(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256Postgres(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );
  return `\\x${bytesToHex(new Uint8Array(digest))}`;
}

export async function hmacPostgres(
  secret: string,
  value: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value)
  );
  return `\\x${bytesToHex(new Uint8Array(digest))}`;
}

export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const candidate =
    forwarded?.split(',')[0]?.trim() ??
    request.headers.get('cf-connecting-ip')?.trim();
  if (!candidate || candidate.length > 64 || /[\r\n]/.test(candidate)) {
    return null;
  }
  return candidate;
}
