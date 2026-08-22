import { createClient } from 'jsr:@supabase/supabase-js@2';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

/**
 * Account deletion — Product Constitution Article 8.2 and 8.6, and an App
 * Store requirement for any app that offers sign-up.
 *
 * This runs as an Edge Function because deletion needs the service role, and
 * the service role must never reach the client (docs/SECURITY.md). The client
 * half in src/features/profiles/api.ts calls this and nothing else.
 *
 * What deletion does, and what it deliberately does not do:
 *
 *   auth.users row          deleted
 *   profiles row            deleted, by cascade from auth.users
 *   draw_candidates rows    deleted, by cascade from profiles
 *   daily_draws rows        KEPT, with selected_user_id set to null
 *
 * That last line is the tombstone from Article 8.6. The Archive's sequence is
 * permanent even when a person is not: the human number, the date, the pool
 * hash and the seed survive, so the fairness record stays verifiable, while the
 * identity is gone. `on delete set null` in the Phase 4 migration is what makes
 * this happen — deletion cannot silently destroy the audit trail.
 *
 * Deploy with:
 *   npx supabase functions deploy delete-account --project-ref <ref>
 */

interface DeletionResult {
  deleted: true;
  /** True when the person had been published; useful for support, not for UI. */
  wasPublished: boolean;
}

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
    // Never leak which one is missing.
    console.error('delete-account: function environment is incomplete');
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Identify the caller from their own token. The account deleted is always
  // the caller's own — this endpoint takes no user id, so it cannot be aimed
  // at somebody else.
  const token = authorization.slice('Bearer '.length);
  const { data: userData, error: userError } = await admin.auth.getUser(token);

  if (userError || !userData.user) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const userId = userData.user.id;

  // Recorded before deletion, because afterwards there is nothing left to ask.
  const { count: publishedCount } = await admin
    .from('daily_draws')
    .select('id', { count: 'exact', head: true })
    .eq('selected_user_id', userId);

  // Storage first: an orphaned object is not reachable through any row, so
  // deleting the row first would strand it.
  const { data: files } = await admin.storage
    .from('avatars')
    .list(userId, { limit: 100 });

  if (files && files.length > 0) {
    const { error: storageError } = await admin.storage
      .from('avatars')
      .remove(files.map((file) => `${userId}/${file.name}`));

    if (storageError) {
      console.error('delete-account: storage removal failed', storageError);
      return jsonResponse({ error: 'deletion_failed' }, 500);
    }
  }

  // Cascades to profiles, and from there to draw_candidates. daily_draws keeps
  // its rows with a null selected_user_id: the tombstone.
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

  if (deleteError) {
    console.error('delete-account: user deletion failed', deleteError);
    return jsonResponse({ error: 'deletion_failed' }, 500);
  }

  const result: DeletionResult = {
    deleted: true,
    wasPublished: (publishedCount ?? 0) > 0,
  };

  return jsonResponse(result);
});
