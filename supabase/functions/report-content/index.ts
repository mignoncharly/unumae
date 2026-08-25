import { createClient } from 'jsr:@supabase/supabase-js@2';

import {
  clientIp,
  hmacPostgres,
  sha256Postgres,
} from '../_shared/attestationProtocol.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TARGETS = new Set(['profile', 'portrait', 'question']);
const REASONS = new Set([
  'spam',
  'harassment',
  'hate',
  'sexual',
  'violence',
  'impersonation',
  'other',
]);

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST')
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const pepper = Deno.env.get('ATTESTATION_BINDING_PEPPER');
  const authorization = request.headers.get('Authorization');
  const installationToken = request.headers.get('X-Installation-Session');
  const address = clientIp(request);
  if (!url || !publicKey || !serviceKey || !pepper || !address)
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  if (
    !authorization?.startsWith('Bearer ') ||
    !installationToken ||
    installationToken.length < 32 ||
    installationToken.length > 128
  ) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > 2048) return jsonResponse({ error: 'invalid_request' }, 400);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 2048)
    return jsonResponse({ error: 'invalid_request' }, 400);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw || '{}') as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }
  if (
    !TARGETS.has(String(body.targetType)) ||
    !UUID.test(String(body.targetId)) ||
    !REASONS.has(String(body.reason)) ||
    (body.note != null &&
      (typeof body.note !== 'string' || body.note.length > 1000))
  ) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const token = authorization.slice(7);
  const user = await admin.auth.getUser(token);
  if (user.error || !user.data.user)
    return jsonResponse({ error: 'unauthorized' }, 401);
  const sessionHash = await sha256Postgres(installationToken);
  const [installation, network] = await Promise.all([
    admin.rpc('authorize_installation_request', {
      target_user: user.data.user.id,
      target_session_hash: sessionHash,
      target_scope: 'report-installation-day',
      maximum_requests: 30,
      window_seconds: 86400,
    }),
    admin.rpc('consume_abuse_rate_limit', {
      target_scope: 'report-network-hour',
      target_key_hash: await hmacPostgres(pepper, `report-network:${address}`),
      maximum_requests: 60,
      window_seconds: 3600,
    }),
  ]);
  if (
    installation.error ||
    network.error ||
    installation.data !== true ||
    network.data !== true
  )
    return jsonResponse({ error: 'rate_limited_or_unverified' }, 429);
  const userClient = createClient(url, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const result = await userClient.rpc('report_content', {
    report_target_type: body.targetType,
    report_target_id: body.targetId,
    report_reason: body.reason,
    report_note: body.note ?? null,
  });
  if (result.error) return jsonResponse({ error: 'report_rejected' }, 409);
  return jsonResponse({ reportId: result.data }, 201);
});
