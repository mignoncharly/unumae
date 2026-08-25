import { createClient } from 'jsr:@supabase/supabase-js@2';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { isServiceRoleRequest } from '../_shared/serviceRole.ts';

type DeletionStage = 'storage_deleting' | 'database_deleting' | 'auth_deleting';

interface DeletionJob {
  request_id: string;
  user_id: string;
  stage: DeletionStage;
  correlation_id: string;
}

interface InvocationPayload {
  jobRunId?: number;
}

interface ListedObject {
  id: string | null;
  name: string;
}

const PAGE_SIZE = 100;
const DELETE_BATCH_SIZE = 100;
const MAX_LEGACY_OBJECTS = 10_000;

async function listPrefix(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  rootPrefix: string
): Promise<string[]> {
  const directories = [rootPrefix];
  const objects: string[] = [];

  while (directories.length > 0) {
    const prefix = directories.shift();
    if (!prefix) break;

    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await admin.storage.from(bucket).list(prefix, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw new Error('storage_list_failed');

      const entries = (data ?? []) as ListedObject[];
      for (const entry of entries) {
        const path = `${prefix}/${entry.name}`;
        if (entry.id === null) directories.push(path);
        else objects.push(path);
        if (objects.length > MAX_LEGACY_OBJECTS) {
          throw new Error('storage_object_limit_exceeded');
        }
      }
      if (entries.length < PAGE_SIZE) break;
    }
  }

  return objects;
}

async function deleteAndVerifyPrefix(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  userId: string
): Promise<number> {
  const paths = await listPrefix(admin, bucket, userId);
  for (let index = 0; index < paths.length; index += DELETE_BATCH_SIZE) {
    const batch = paths.slice(index, index + DELETE_BATCH_SIZE);
    const { error } = await admin.storage.from(bucket).remove(batch);
    if (error) throw new Error('storage_remove_failed');
  }

  const remaining = await listPrefix(admin, bucket, userId);
  if (remaining.length > 0) throw new Error('storage_verify_failed');
  return paths.length;
}

function isMissingAuthUser(
  error: { code?: string; status?: number } | null
): boolean {
  return error?.code === 'user_not_found' || error?.status === 404;
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
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }
  if (!(await isServiceRoleRequest(request, supabaseUrl, serviceRoleKey))) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const payload = (await request.json().catch(() => ({}))) as InvocationPayload;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error: claimError } = await admin.rpc(
    'claim_account_deletion_requests',
    { limit_rows: 5 }
  );
  if (claimError) {
    return jsonResponse({ error: 'claim_failed' }, 500);
  }

  const jobs = (data ?? []) as DeletionJob[];
  let completed = 0;
  let failed = 0;

  for (const job of jobs) {
    let stage: DeletionStage = job.stage;
    try {
      if (stage === 'storage_deleting') {
        const avatarCount = await deleteAndVerifyPrefix(
          admin,
          'avatars',
          job.user_id
        );
        const portraitCount = await deleteAndVerifyPrefix(
          admin,
          'portraits',
          job.user_id
        );
        const { data: advanced, error } = await admin.rpc(
          'advance_account_deletion',
          {
            target_request: job.request_id,
            expected_stage: 'storage_deleting',
            next_stage: 'database_deleting',
            deleted_avatars: avatarCount,
            deleted_portraits: portraitCount,
          }
        );
        if (error || !advanced) throw new Error('storage_stage_commit_failed');
        stage = 'database_deleting';
      }

      if (stage === 'database_deleting') {
        const { data: deleted, error } = await admin.rpc(
          'delete_account_database_records',
          { target_request: job.request_id }
        );
        if (error || !deleted) throw new Error('database_delete_failed');
        stage = 'auth_deleting';
      }

      if (stage === 'auth_deleting') {
        const lookup = await admin.auth.admin.getUserById(job.user_id);
        if (lookup.data.user) {
          const { error } = await admin.auth.admin.deleteUser(job.user_id);
          if (error) throw new Error('auth_delete_failed');
        } else if (!isMissingAuthUser(lookup.error)) {
          throw new Error('auth_lookup_failed');
        }

        const { data: finished, error } = await admin.rpc(
          'complete_account_deletion',
          { target_request: job.request_id }
        );
        if (error || !finished) throw new Error('completion_write_failed');
      }

      completed += 1;
      console.log(
        JSON.stringify({
          event: 'account_deletion_completed',
          request_id: job.request_id,
          correlation_id: job.correlation_id,
        })
      );
    } catch (caught) {
      failed += 1;
      const errorCode =
        caught instanceof Error ? caught.message : 'deletion_stage_failed';
      await admin.rpc('fail_account_deletion', {
        target_request: job.request_id,
        error_code: errorCode,
      });
      console.error(
        JSON.stringify({
          event: 'account_deletion_failed',
          request_id: job.request_id,
          correlation_id: job.correlation_id,
          stage,
          error_code: errorCode,
        })
      );
    }
  }

  if (typeof payload.jobRunId === 'number') {
    await admin.rpc('complete_job_run', {
      target_run: payload.jobRunId,
      succeeded: failed === 0,
      result_detail: `claimed=${jobs.length};completed=${completed};failed=${failed}`,
    });
  }

  return jsonResponse({ claimed: jobs.length, completed, failed });
});
