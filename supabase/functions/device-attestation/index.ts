import { createClient } from 'jsr:@supabase/supabase-js@2';

import {
  clientIp,
  hmacPostgres,
  parseAttestationRequest,
  randomChallenge,
  sha256Postgres,
} from '../_shared/attestationProtocol.ts';
import {
  AttestationProviderError,
  platformAttestationVerifier,
} from '../_shared/platformAttestation.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const CHALLENGE_LIFETIME_MS = 5 * 60_000;
const MAX_BODY_BYTES = 48 * 1024;

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      JSON.stringify({
        event: 'attestation_misconfigured',
        error_code: 'server_misconfigured',
      })
    );
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const token = authorization.slice('Bearer '.length);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (declaredLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(rawBody || '{}') as unknown;
  } catch {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }
  const parsed = parseAttestationRequest(decoded);
  if (!parsed) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }

  if (parsed.action === 'challenge') {
    const challenge = randomChallenge();
    const expiresAt = new Date(
      Date.now() + CHALLENGE_LIFETIME_MS
    ).toISOString();
    const created = await admin.rpc('create_attestation_challenge', {
      target_user: userData.user.id,
      target_platform: parsed.platform,
      target_hash: await sha256Postgres(challenge),
      target_expires_at: expiresAt,
    });
    if (created.error || typeof created.data !== 'string') {
      console.error(
        JSON.stringify({
          event: 'attestation_challenge_failed',
          user_id: userData.user.id,
          error_code: 'challenge_write_failed',
        })
      );
      return jsonResponse({ error: 'challenge_write_failed' }, 500);
    }
    return jsonResponse({
      challengeId: created.data,
      challenge,
      expiresAt,
    });
  }

  const challengeHash = await sha256Postgres(parsed.challenge);
  const consumed = await admin.rpc('consume_attestation_challenge', {
    target_user: userData.user.id,
    target_challenge: parsed.challengeId,
    target_hash: challengeHash,
  });
  if (consumed.error || consumed.data !== true) {
    return jsonResponse({ error: 'challenge_invalid_or_expired' }, 409);
  }

  const bindingPepper = Deno.env.get('ATTESTATION_BINDING_PEPPER');
  if (!bindingPepper) {
    console.error(
      JSON.stringify({
        event: 'attestation_misconfigured',
        error_code: 'binding_pepper_missing',
      })
    );
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  try {
    const evidence = await platformAttestationVerifier.verify(parsed);
    const bindingHash = await hmacPostgres(
      bindingPepper,
      evidence.bindingMaterial
    );
    const keyHash = await hmacPostgres(bindingPepper, evidence.keyMaterial);

    const registered = await admin.rpc('register_verified_device_attestation', {
      target_user: userData.user.id,
      target_platform: parsed.platform,
      target_binding_hash: bindingHash,
      target_key_hash: keyHash,
      target_public_key: evidence.publicKey,
      provider_reports_bound: evidence.providerReportsBound,
    });
    if (registered.error) {
      throw new Error('attestation_registration_failed');
    }

    const address = clientIp(request);
    if (address) {
      const networkHash = await hmacPostgres(
        bindingPepper,
        `network:${address}`
      );
      const recorded = await admin.rpc('record_account_network_signal', {
        target_user: userData.user.id,
        target_network_hash: networkHash,
        target_asn: null,
        target_class: 'unknown',
      });
      if (recorded.error) {
        console.error(
          JSON.stringify({
            event: 'attestation_network_signal_failed',
            user_id: userData.user.id,
            error_code: 'network_signal_write_failed',
          })
        );
      }
    }

    const canBind = await admin.rpc('can_bind_device_to_pool', {
      target_user: userData.user.id,
    });
    let poolBound = false;
    if (!canBind.error && canBind.data === true) {
      if (!evidence.providerReportsBound) {
        await evidence.bindProviderFlag();
      }
      const bound = await admin.rpc('bind_verified_device_to_pool', {
        target_user: userData.user.id,
        target_binding_hash: bindingHash,
      });
      poolBound = !bound.error && bound.data === true;
      if (poolBound) {
        await admin.rpc('refresh_selection_eligibility');
      }
    }

    const profile = await admin
      .from('profiles')
      .select('assurance_level,review_pending,selection_eligible')
      .eq('id', userData.user.id)
      .single();
    if (profile.error) throw new Error('assurance_read_failed');

    console.log(
      JSON.stringify({
        event: 'attestation_verified',
        user_id: userData.user.id,
        platform: parsed.platform,
        pool_bound: poolBound,
        review_pending: profile.data.review_pending,
      })
    );
    return jsonResponse({
      verified: true,
      assuranceLevel: profile.data.assurance_level,
      reviewPending: profile.data.review_pending,
      poolBound,
      selectionEligible: profile.data.selection_eligible,
    });
  } catch (error) {
    const providerError =
      error instanceof AttestationProviderError ? error : null;
    const errorCode = providerError?.code ?? 'verification_failed';
    console.error(
      JSON.stringify({
        event: 'attestation_failed',
        user_id: userData.user.id,
        platform: parsed.platform,
        error_code: errorCode,
      })
    );
    return jsonResponse(
      { error: errorCode },
      errorCode === 'provider_unavailable'
        ? 503
        : errorCode === 'misconfigured'
          ? 500
          : 400
    );
  }
});
