import { verifyAttestation } from 'jsr:@bradford-tech/supabase-integrity-attest@0.9.1';
import { importPKCS8, SignJWT } from 'npm:jose@6.1.3';

import {
  type AndroidEvidence,
  type IosEvidence,
  type PlatformVerifier,
  type VerificationRequest,
  type VerifiedPlatformEvidence,
} from './attestationProtocol.ts';
import { fetchProvider } from './providerFetch.ts';

export class AttestationProviderError extends Error {
  constructor(
    readonly code:
      'provider_unavailable' | 'invalid_attestation' | 'misconfigured',
    message: string
  ) {
    super(message);
  }
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new AttestationProviderError('misconfigured', `${name} is missing`);
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

async function appleJwt(): Promise<string> {
  const teamId = requireEnv('APPLE_TEAM_ID');
  const keyId = requireEnv('APPLE_DEVICECHECK_KEY_ID');
  const privateKey = requireEnv('APPLE_DEVICECHECK_PRIVATE_KEY').replaceAll(
    '\\n',
    '\n'
  );
  const key = await importPKCS8(privateKey, 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .sign(key);
}

function appleDeviceCheckUrl(path: string): string {
  const development =
    Deno.env.get('APPLE_DEVICECHECK_ENVIRONMENT') === 'development';
  return `https://api${development ? '.development' : ''}.devicecheck.apple.com/v1/${path}`;
}

async function callAppleDeviceCheck(
  path: 'query_two_bits' | 'update_two_bits',
  deviceToken: string,
  bits?: { bit0: boolean; bit1?: boolean }
): Promise<Record<string, unknown>> {
  let authorization: string;
  try {
    authorization = await appleJwt();
  } catch (error) {
    if (error instanceof AttestationProviderError) throw error;
    throw new AttestationProviderError('misconfigured', 'Apple key is invalid');
  }

  const response = await fetchProvider(
    appleDeviceCheckUrl(path),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authorization}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device_token: deviceToken,
        transaction_id: crypto.randomUUID(),
        timestamp: Date.now(),
        ...bits,
      }),
    },
    10_000
  );
  if (!response) {
    throw new AttestationProviderError(
      'provider_unavailable',
      'Apple DeviceCheck timed out'
    );
  }
  if (!response.ok) {
    const code =
      response.status >= 500 || response.status === 429
        ? 'provider_unavailable'
        : 'invalid_attestation';
    throw new AttestationProviderError(
      code,
      `Apple DeviceCheck HTTP ${response.status}`
    );
  }
  return asRecord(await response.json().catch(() => ({})));
}

async function verifyIos(
  evidence: IosEvidence,
  challenge: string
): Promise<VerifiedPlatformEvidence> {
  let publicKeyPem: string;
  try {
    const clientDataHash = new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(challenge))
    );
    ({ publicKeyPem } = await verifyAttestation(
      {
        appId: `${requireEnv('APPLE_TEAM_ID')}.${requireEnv('IOS_BUNDLE_IDENTIFIER')}`,
        developmentEnv:
          Deno.env.get('IOS_ALLOW_DEVELOPMENT_ATTESTATION') === 'true',
      },
      evidence.keyId,
      clientDataHash,
      evidence.attestation
    ));
  } catch (error) {
    if (error instanceof AttestationProviderError) throw error;
    throw new AttestationProviderError(
      'invalid_attestation',
      'Apple App Attest verification failed'
    );
  }

  const deviceState = await callAppleDeviceCheck(
    'query_two_bits',
    evidence.deviceToken
  );

  return {
    bindingMaterial: `ios:${evidence.keyId}`,
    keyMaterial: `ios:${evidence.keyId}`,
    publicKey: publicKeyPem,
    providerReportsBound: deviceState.bit0 === true,
    bindProviderFlag: async () => {
      await callAppleDeviceCheck('update_two_bits', evidence.deviceToken, {
        bit0: true,
      });
      return true;
    },
  };
}

interface GoogleCredentials {
  client_email: string;
  private_key: string;
  project_id?: string;
}

function googleCredentials(): GoogleCredentials {
  try {
    const parsed = JSON.parse(
      requireEnv('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON')
    ) as Partial<GoogleCredentials>;
    if (!parsed.client_email || !parsed.private_key)
      throw new Error('missing fields');
    return parsed as GoogleCredentials;
  } catch (error) {
    if (error instanceof AttestationProviderError) throw error;
    throw new AttestationProviderError(
      'misconfigured',
      'Google service account JSON is invalid'
    );
  }
}

async function googleBearerToken(
  credentials: GoogleCredentials
): Promise<string> {
  let assertion: string;
  try {
    const key = await importPKCS8(
      credentials.private_key.replaceAll('\\n', '\n'),
      'RS256'
    );
    assertion = await new SignJWT({
      scope: 'https://www.googleapis.com/auth/playintegrity',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuer(credentials.client_email)
      .setAudience('https://oauth2.googleapis.com/token')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(key);
  } catch {
    throw new AttestationProviderError(
      'misconfigured',
      'Google service-account key is invalid'
    );
  }

  const response = await fetchProvider(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    },
    10_000
  );
  const body = asRecord(await response?.json().catch(() => ({})));
  if (!response?.ok || typeof body.access_token !== 'string') {
    throw new AttestationProviderError(
      'provider_unavailable',
      'Google access token was unavailable'
    );
  }
  return body.access_token;
}

async function verifyAndroid(
  evidence: AndroidEvidence,
  challenge: string
): Promise<VerifiedPlatformEvidence> {
  const packageName = requireEnv('GOOGLE_PLAY_PACKAGE_NAME');
  const credentials = googleCredentials();

  let payload: Record<string, unknown>;
  const decoded = await fetchProvider(
    `https://playintegrity.googleapis.com/v1/${encodeURIComponent(packageName)}:decodeIntegrityToken`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await googleBearerToken(credentials)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ integrityToken: evidence.integrityToken }),
    },
    10_000
  );
  if (!decoded) {
    throw new AttestationProviderError(
      'provider_unavailable',
      'Google Play Integrity timed out'
    );
  }
  if (!decoded.ok) {
    throw new AttestationProviderError(
      decoded.status >= 500 || decoded.status === 429
        ? 'provider_unavailable'
        : 'invalid_attestation',
      `Google Play Integrity HTTP ${decoded.status}`
    );
  }
  const decodedBody = asRecord(await decoded.json().catch(() => ({})));
  payload = asRecord(decodedBody.tokenPayloadExternal);

  const requestDetails = asRecord(payload.requestDetails);
  const appIntegrity = asRecord(payload.appIntegrity);
  const deviceIntegrity = asRecord(payload.deviceIntegrity);
  const accountDetails = asRecord(payload.accountDetails);
  const environmentDetails = asRecord(payload.environmentDetails);
  const recall = asRecord(environmentDetails.deviceRecall);
  const recallValues = asRecord(recall.values);
  const verdicts = Array.isArray(deviceIntegrity.deviceRecognitionVerdict)
    ? deviceIntegrity.deviceRecognitionVerdict
    : [];
  const timestamp = Number(requestDetails.timestampMillis);
  const certificateAllowlist = (
    Deno.env.get('GOOGLE_PLAY_CERTIFICATE_DIGESTS') ?? ''
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const returnedDigests = Array.isArray(appIntegrity.certificateSha256Digest)
    ? appIntegrity.certificateSha256Digest.filter(
        (value): value is string => typeof value === 'string'
      )
    : [];

  const valid =
    requestDetails.requestHash === challenge &&
    Number.isFinite(timestamp) &&
    Math.abs(Date.now() - timestamp) <= 2 * 60_000 &&
    appIntegrity.appRecognitionVerdict === 'PLAY_RECOGNIZED' &&
    appIntegrity.packageName === packageName &&
    verdicts.includes('MEETS_DEVICE_INTEGRITY') &&
    accountDetails.appLicensingVerdict === 'LICENSED' &&
    (certificateAllowlist.length === 0 ||
      returnedDigests.some((digest) => certificateAllowlist.includes(digest)));
  if (!valid) {
    throw new AttestationProviderError(
      'invalid_attestation',
      'Google Play Integrity verdict failed policy'
    );
  }

  return {
    bindingMaterial: `android:${evidence.keyId}`,
    keyMaterial: `android:${evidence.keyId}`,
    publicKey: null,
    providerReportsBound: recallValues.bitFirst === true,
    bindProviderFlag: async () => {
      const response = await fetchProvider(
        `https://playintegrity.googleapis.com/v1/${encodeURIComponent(packageName)}/deviceRecall:write`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${await googleBearerToken(credentials)}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            integrityToken: evidence.integrityToken,
            newValues: { bitFirst: true },
          }),
        },
        10_000
      );
      if (!response || !response.ok) {
        throw new AttestationProviderError(
          'provider_unavailable',
          'Google device recall write failed'
        );
      }
      return true;
    },
  };
}

export const platformAttestationVerifier: PlatformVerifier = {
  async verify(request: VerificationRequest) {
    if (
      request.platform === 'ios' &&
      request.evidence.kind === 'ios-app-attest'
    ) {
      return verifyIos(request.evidence, request.challenge);
    }
    if (
      request.platform === 'android' &&
      request.evidence.kind === 'android-play-integrity'
    ) {
      return verifyAndroid(request.evidence, request.challenge);
    }
    throw new AttestationProviderError(
      'invalid_attestation',
      'Attestation platform and evidence do not match'
    );
  },
};
