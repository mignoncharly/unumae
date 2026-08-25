import { createClient } from 'jsr:@supabase/supabase-js@2';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

interface DeletionRequestBody {
  idempotencyKey?: unknown;
}

/** Starts or resumes deletion; a leased worker performs destructive stages. */
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
        event: 'deletion_request_misconfigured',
        error_code: 'server_misconfigured',
      })
    );
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const body = (await request.json().catch(() => ({}))) as DeletionRequestBody;
  if (
    typeof body.idempotencyKey !== 'string' ||
    body.idempotencyKey.length < 16 ||
    body.idempotencyKey.length > 128
  ) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }

  const token = authorization.slice('Bearer '.length);
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const existing = await admin
    .from('deletion_requests')
    .select('id')
    .eq('user_id', userData.user.id)
    .neq('current_stage', 'completed')
    .limit(1)
    .maybeSingle();
  if (existing.error) {
    return jsonResponse({ error: 'request_lookup_failed' }, 500);
  }

  const lastSignIn = Date.parse(userData.user.last_sign_in_at ?? '');
  if (
    !existing.data &&
    (!Number.isFinite(lastSignIn) || Date.now() - lastSignIn > 15 * 60 * 1000)
  ) {
    return jsonResponse({ error: 'recent_authentication_required' }, 403);
  }

  // The service key is the API key only. The caller JWT remains Authorization,
  // preserving auth.uid() and the database's recent-authentication check.
  const caller = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await caller.rpc('request_account_deletion', {
    idempotency_key: body.idempotencyKey,
  });

  if (error || !data?.[0]) {
    const recentAuth = error?.message?.includes(
      'Recent authentication required'
    );
    console.error(
      JSON.stringify({
        event: 'deletion_request_failed',
        user_id: userData.user.id,
        error_code: recentAuth
          ? 'recent_authentication_required'
          : 'request_failed',
      })
    );
    return jsonResponse(
      {
        error: recentAuth ? 'recent_authentication_required' : 'request_failed',
      },
      recentAuth ? 403 : 500
    );
  }

  const result = data[0] as {
    request_id: string;
    state: string;
    correlation_id: string;
    requested_at: string;
    was_published: boolean;
  };

  console.log(
    JSON.stringify({
      event: 'deletion_request_accepted',
      request_id: result.request_id,
      correlation_id: result.correlation_id,
      state: result.state,
    })
  );

  return jsonResponse(
    {
      accepted: true,
      state: result.state,
      correlationId: result.correlation_id,
      requestedAt: result.requested_at,
      wasPublished: result.was_published,
    },
    202
  );
});
