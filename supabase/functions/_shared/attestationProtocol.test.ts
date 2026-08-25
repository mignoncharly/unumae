import {
  clientIp,
  hmacPostgres,
  parseAttestationRequest,
  randomChallenge,
  sha256Postgres,
} from './attestationProtocol.ts';

Deno.test('issues 256-bit base64url challenges', () => {
  const first = randomChallenge();
  const second = randomChallenge();
  if (!/^[A-Za-z0-9_-]{43}$/.test(first) || first === second) {
    throw new Error('challenge is not unique 256-bit base64url');
  }
});

Deno.test('parses a bounded iOS registration and ignores client status', () => {
  const parsed = parseAttestationRequest({
    action: 'verify',
    platform: 'ios',
    challengeId: '40000000-0000-4000-8000-000000000001',
    challenge: 'a'.repeat(43),
    assuranceLevel: 'reviewed',
    evidence: {
      kind: 'ios-app-attest',
      keyId: 'a'.repeat(32),
      attestation: 'a'.repeat(64),
      deviceToken: 'b'.repeat(64),
      status: 'verified',
    },
  });
  if (parsed?.action !== 'verify' || 'assuranceLevel' in parsed) {
    throw new Error('server request parser trusted a client status');
  }
});

Deno.test('rejects malformed, mismatched, and oversized evidence', () => {
  const base = {
    action: 'verify',
    challengeId: '40000000-0000-4000-8000-000000000001',
    challenge: 'a'.repeat(43),
  };
  const malformed = [
    { ...base, platform: 'ios', evidence: {} },
    {
      ...base,
      platform: 'android',
      evidence: {
        kind: 'ios-app-attest',
        keyId: 'a'.repeat(32),
        attestation: 'a'.repeat(64),
        deviceToken: 'b'.repeat(64),
      },
    },
    {
      ...base,
      platform: 'android',
      evidence: {
        kind: 'android-play-integrity',
        keyId: 'a'.repeat(32),
        integrityToken: 'a'.repeat(32_769),
      },
    },
    { ...base, platform: 'ios', challenge: 'not base64url', evidence: {} },
  ];
  if (malformed.some((value) => parseAttestationRequest(value) !== null)) {
    throw new Error('malformed evidence was accepted');
  }
});

Deno.test(
  'hashes are fixed-size Postgres bytea and HMAC is keyed',
  async () => {
    const digest = await sha256Postgres('challenge');
    const first = await hmacPostgres('pepper-one', 'device');
    const second = await hmacPostgres('pepper-two', 'device');
    if (!/^\\x[0-9a-f]{64}$/.test(digest) || first === second) {
      throw new Error('hash encoding or key separation failed');
    }
  }
);

Deno.test('extracts only the first bounded forwarded address', () => {
  const request = new Request('https://example.test', {
    headers: { 'x-forwarded-for': '203.0.113.4, 10.0.0.1' },
  });
  if (clientIp(request) !== '203.0.113.4') {
    throw new Error('forwarded address parsing failed');
  }
});
