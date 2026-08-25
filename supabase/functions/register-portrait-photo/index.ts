import { decode } from 'npm:jpeg-js@0.4.4';
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

interface RegistrationBody {
  portraitId?: unknown;
  objectPath?: unknown;
}

const MAX_BYTES = 8 * 1024 * 1024;
const UUID =
  '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const UUID_PATTERN = new RegExp(`^${UUID}$`, 'i');

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

  // Authenticate before parsing or validating caller-controlled input so an
  // invalid credential cannot use response differences as an API oracle.
  const body = (await request.json().catch(() => ({}))) as RegistrationBody;
  if (
    typeof body.portraitId !== 'string' ||
    !UUID_PATTERN.test(body.portraitId) ||
    typeof body.objectPath !== 'string' ||
    body.objectPath.length > 160
  ) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }

  const expected = new RegExp(
    `^${userData.user.id}/${body.portraitId}/photo/${UUID}\\.jpg$`,
    'i'
  );
  if (!expected.test(body.objectPath)) {
    return jsonResponse({ error: 'invalid_object_path' }, 400);
  }

  let shouldRemove = true;
  try {
    const downloaded = await admin.storage
      .from('portraits')
      .download(body.objectPath);
    if (downloaded.error || !downloaded.data) {
      throw new Error('object_download_failed');
    }
    if (downloaded.data.type !== 'image/jpeg') {
      throw new Error('mime_mismatch');
    }

    const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
    if (bytes.length < 4 || bytes.length > MAX_BYTES) {
      throw new Error('size_invalid');
    }

    // Full decoding rejects truncated/polyglot payloads. Resolution and memory
    // limits prevent a small compressed file becoming a decompression bomb.
    decode(bytes, {
      useTArray: true,
      formatAsRGBA: false,
      tolerantDecoding: false,
      maxResolutionInMP: 12,
      maxMemoryUsageInMB: 64,
    });

    const { data, error } = await admin.rpc(
      'register_validated_portrait_photo',
      {
        target_user: userData.user.id,
        target_portrait: body.portraitId,
        object_name: body.objectPath,
        object_size: bytes.length,
      }
    );
    if (error || data !== body.objectPath) {
      throw new Error('registration_failed');
    }

    shouldRemove = false;
    return jsonResponse({ path: body.objectPath });
  } catch (caught) {
    const errorCode =
      caught instanceof Error ? caught.message : 'validation_failed';
    console.error(
      JSON.stringify({
        event: 'portrait_upload_rejected',
        user_id: userData.user.id,
        error_code: errorCode,
      })
    );
    return jsonResponse({ error: 'portrait_upload_rejected' }, 422);
  } finally {
    if (shouldRemove) {
      await admin.storage.from('portraits').remove([body.objectPath]);
    }
  }
});
