import {
  AttestationProviderError,
  platformAttestationVerifier,
} from './platformAttestation.ts';

Deno.test(
  'malformed App Attest objects fail closed before DeviceCheck',
  async () => {
    const previousTeam = Deno.env.get('APPLE_TEAM_ID');
    const previousBundle = Deno.env.get('IOS_BUNDLE_IDENTIFIER');
    try {
      Deno.env.set('APPLE_TEAM_ID', 'TESTTEAM01');
      Deno.env.set('IOS_BUNDLE_IDENTIFIER', 'com.unumae.app');
      await platformAttestationVerifier.verify({
        action: 'verify',
        platform: 'ios',
        challengeId: '40000000-0000-4000-8000-000000000001',
        challenge: 'a'.repeat(43),
        evidence: {
          kind: 'ios-app-attest',
          keyId: 'a'.repeat(43),
          attestation: 'a'.repeat(64),
          deviceToken: 'b'.repeat(64),
        },
      });
      throw new Error('malformed attestation unexpectedly verified');
    } catch (error) {
      if (
        !(error instanceof AttestationProviderError) ||
        error.code !== 'invalid_attestation'
      ) {
        throw error;
      }
    } finally {
      if (previousTeam === undefined) Deno.env.delete('APPLE_TEAM_ID');
      else Deno.env.set('APPLE_TEAM_ID', previousTeam);
      if (previousBundle === undefined)
        Deno.env.delete('IOS_BUNDLE_IDENTIFIER');
      else Deno.env.set('IOS_BUNDLE_IDENTIFIER', previousBundle);
    }
  }
);
