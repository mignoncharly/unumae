import { createClient } from 'jsr:@supabase/supabase-js@2';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { isServiceRoleRequest } from '../_shared/serviceRole.ts';
import {
  finishWorkerRun,
  startWorkerRun,
  type WorkerInvocation,
} from '../_shared/workerRun.ts';

type AccountStatus =
  'active' | 'suspended' | 'banned' | 'deletion_pending' | 'deleted';

interface EnforcementJob {
  job_id: string;
  user_id: string;
  target_status: AccountStatus;
  status_version: number;
}

/**
 * Applies the transactional account-state outbox to Supabase Auth.
 *
 * The database guard is authoritative immediately. This worker disables Auth
 * refresh/session use as defense in depth and retries through the outbox when
 * the provider is temporarily unavailable.
 */
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
        event: 'account_enforcement_misconfigured',
        error_code: 'server_misconfigured',
      })
    );
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  // verify_jwt accepts any valid user JWT. This is a privileged worker, so it
  // additionally requires the exact service-role credential used by pg_net.
  if (!(await isServiceRoleRequest(request, supabaseUrl, serviceRoleKey))) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const payload = (await request.json().catch(() => ({}))) as WorkerInvocation;
  const workerRun = await startWorkerRun(
    admin,
    payload,
    'enforce-account-status'
  );
  if (!workerRun) return jsonResponse({ error: 'job_run_unavailable' }, 409);
  const { data, error: claimError } = await admin.rpc(
    'claim_account_enforcement_jobs',
    { limit_rows: 10 }
  );

  if (claimError) {
    console.error(
      JSON.stringify({
        event: 'account_enforcement_claim_failed',
        error_code: 'claim_failed',
      })
    );
    await finishWorkerRun(admin, workerRun, {
      succeeded: false,
      retryable: true,
      detail: 'account_enforcement_claim_failed',
      providerCategory: 'internal',
    });
    return jsonResponse({ error: 'claim_failed' }, 500);
  }

  const jobs = (data ?? []) as EnforcementJob[];
  let completed = 0;
  let failed = 0;

  for (const job of jobs) {
    // A provider ban would also prevent appeal/export/deletion after the
    // current access token expires. Revoke existing refresh sessions instead;
    // the person may re-authenticate only to the restricted support surface,
    // while the database guard remains immediately authoritative.
    const { error: authError } =
      job.target_status === 'active'
        ? { error: null }
        : await admin.rpc('revoke_account_sessions', {
            target_user: job.user_id,
            target_status_version: job.status_version,
          });

    if (authError) {
      failed += 1;
      await admin.rpc('fail_account_enforcement_job', {
        target_job: job.job_id,
        error_code: 'auth_update_failed',
      });
      console.error(
        JSON.stringify({
          event: 'account_enforcement_failed',
          job_id: job.job_id,
          status_version: job.status_version,
          error_code: 'auth_update_failed',
        })
      );
      continue;
    }

    const { error: completionError } = await admin.rpc(
      'complete_account_enforcement_job',
      { target_job: job.job_id }
    );
    if (completionError) {
      failed += 1;
      await admin.rpc('fail_account_enforcement_job', {
        target_job: job.job_id,
        error_code: 'completion_write_failed',
      });
      continue;
    }

    completed += 1;
  }

  await finishWorkerRun(admin, workerRun, {
    succeeded: failed === 0,
    retryable: failed > 0,
    detail: `claimed=${jobs.length};completed=${completed};failed=${failed}`,
    providerCategory: failed > 0 ? 'provider_error' : 'accepted',
  });

  console.log(
    JSON.stringify({
      event: 'account_enforcement_batch_completed',
      claimed: jobs.length,
      completed,
      failed,
    })
  );

  return jsonResponse({ claimed: jobs.length, completed, failed });
});
