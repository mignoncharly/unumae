import { createClient } from 'jsr:@supabase/supabase-js@2';

import {
  clientIp,
  hmacPostgres,
  sha256Postgres,
} from '../_shared/attestationProtocol.ts';
import {
  MAX_ANALYTICS_BODY_BYTES,
  parseAnalyticsEnvelope,
} from '../_shared/analyticsProtocol.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST')
    return jsonResponse({ error: 'method_not_allowed' }, 405);

  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_ANALYTICS_BODY_BYTES)
    return jsonResponse({ error: 'invalid_request' }, 400);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_ANALYTICS_BODY_BYTES)
    return jsonResponse({ error: 'invalid_request' }, 400);
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw || '{}') as unknown;
  } catch {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }
  const envelope = parseAnalyticsEnvelope(decoded);
  if (!envelope) return jsonResponse({ error: 'invalid_request' }, 400);

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const pepper = Deno.env.get('ATTESTATION_BINDING_PEPPER');
  const address = clientIp(request);
  if (!url || !key || !pepper || !address)
    return jsonResponse({ error: 'server_misconfigured' }, 500);

  const installationToken = request.headers.get('X-Installation-Session');
  if (
    !envelope.marketingOnly &&
    (!installationToken ||
      installationToken.length < 32 ||
      installationToken.length > 128)
  ) {
    return jsonResponse({ error: 'attestation_required' }, 401);
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const result = await admin.rpc('ingest_analytics_events', {
    target_session_hash: installationToken
      ? await sha256Postgres(installationToken)
      : null,
    target_network_hash: await hmacPostgres(
      pepper,
      `analytics-network:${address}`
    ),
    batch: envelope.events,
    marketing_only: envelope.marketingOnly,
  });
  if (result.error) {
    const denied = /rate limit|invalid|expired|required/i.test(
      result.error.message
    );
    return jsonResponse(
      { error: denied ? 'request_rejected' : 'ingestion_failed' },
      denied ? 429 : 500
    );
  }
  return jsonResponse({ accepted: result.data });
});
