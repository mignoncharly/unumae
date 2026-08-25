import { createClient } from 'jsr:@supabase/supabase-js@2';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { isServiceRoleRequest } from '../_shared/serviceRole.ts';

interface CleanupJob {
  job_id: string;
  bucket_id: 'avatars' | 'portraits';
  object_name: string;
}

interface InvocationPayload {
  jobRunId?: number;
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

  const { data: enqueued, error: enqueueError } = await admin.rpc(
    'enqueue_orphan_storage_objects',
    { limit_rows: 500 }
  );
  if (enqueueError) return jsonResponse({ error: 'enqueue_failed' }, 500);

  const { data, error: claimError } = await admin.rpc(
    'claim_storage_cleanup_jobs',
    { limit_rows: 100 }
  );
  if (claimError) return jsonResponse({ error: 'claim_failed' }, 500);

  const jobs = (data ?? []) as CleanupJob[];
  let completed = 0;
  let failed = 0;

  for (const job of jobs) {
    const { error } = await admin.storage
      .from(job.bucket_id)
      .remove([job.object_name]);
    if (error) {
      failed += 1;
      await admin.rpc('fail_storage_cleanup_job', {
        target_job: job.job_id,
        error_code: 'storage_remove_failed',
      });
      continue;
    }

    const separator = job.object_name.lastIndexOf('/');
    const prefix = separator >= 0 ? job.object_name.slice(0, separator) : '';
    const basename =
      separator >= 0 ? job.object_name.slice(separator + 1) : job.object_name;
    const verification = await admin.storage
      .from(job.bucket_id)
      .list(prefix, { limit: 100, search: basename });
    const remains =
      verification.data?.some((entry) => entry.name === basename) ?? true;
    if (verification.error || remains) {
      failed += 1;
      await admin.rpc('fail_storage_cleanup_job', {
        target_job: job.job_id,
        error_code: verification.error
          ? 'storage_verify_failed'
          : 'object_remains',
      });
      continue;
    }

    await admin.rpc('complete_storage_cleanup_job', {
      target_job: job.job_id,
    });
    completed += 1;
  }

  if (typeof payload.jobRunId === 'number') {
    await admin.rpc('complete_job_run', {
      target_run: payload.jobRunId,
      succeeded: failed === 0,
      run_detail: `enqueued=${enqueued ?? 0};claimed=${jobs.length};completed=${completed};failed=${failed}`,
    });
  }

  console.log(
    JSON.stringify({
      event: 'storage_reconcile_completed',
      enqueued: enqueued ?? 0,
      claimed: jobs.length,
      completed,
      failed,
    })
  );
  return jsonResponse({
    enqueued: enqueued ?? 0,
    claimed: jobs.length,
    completed,
    failed,
  });
});
