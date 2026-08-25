import { createClient } from 'jsr:@supabase/supabase-js@2';

import {
  classifyExpoReceipt,
  type ExpoReceipt,
} from '../_shared/notificationDelivery.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { fetchWithTimeout } from '../_shared/providerFetch.ts';
import { isServiceRoleRequest } from '../_shared/serviceRole.ts';
import {
  finishWorkerRun,
  startWorkerRun,
  type WorkerInvocation,
} from '../_shared/workerRun.ts';

interface ClaimedReceipt {
  ticket_id: string;
  push_token: string;
  lease_token: string;
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST')
    return jsonResponse({ error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return jsonResponse({ error: 'server_misconfigured' }, 500);
  if (!(await isServiceRoleRequest(request, url, key)))
    return jsonResponse({ error: 'unauthorized' }, 401);

  const payload = (await request.json().catch(() => ({}))) as WorkerInvocation;
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const workerRun = await startWorkerRun(
    admin,
    payload,
    'process-push-receipts'
  );
  if (!workerRun) return jsonResponse({ error: 'job_run_unavailable' }, 409);

  const { data, error } = await admin.rpc('claim_expo_push_receipts', {
    batch_size: 300,
  });
  if (error) {
    await finishWorkerRun(admin, workerRun, {
      succeeded: false,
      retryable: true,
      detail: 'Expo receipt queue could not be claimed',
      providerCategory: 'internal',
    });
    return jsonResponse({ error: 'queue_unavailable' }, 500);
  }
  const receipts = (data ?? []) as ClaimedReceipt[];
  if (receipts.length === 0) {
    await finishWorkerRun(admin, workerRun, {
      succeeded: true,
      detail: 'No Expo receipts due',
      providerCategory: 'accepted',
    });
    return jsonResponse({ claimed: 0, delivered: 0, disabled: 0, retrying: 0 });
  }

  const transport = await fetchWithTimeout(
    'https://exp.host/--/api/v2/push/getReceipts',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ ids: receipts.map((item) => item.ticket_id) }),
    }
  );
  let providerCategory:
    'ok' | 'timeout' | 'network' | 'rate_limited' | 'auth' | 'provider_error' =
    transport.category;
  let providerReceipts: Record<string, ExpoReceipt> = {};
  if (transport.response?.ok) {
    try {
      const body = (await transport.response.json()) as {
        data?: Record<string, ExpoReceipt>;
      };
      providerReceipts = body.data ?? {};
      providerCategory = 'ok';
    } catch {
      providerCategory = 'network';
    }
  } else if (transport.response) {
    providerCategory =
      transport.response.status === 401 || transport.response.status === 403
        ? 'auth'
        : transport.response.status === 429
          ? 'rate_limited'
          : 'provider_error';
  }

  let delivered = 0;
  let disabled = 0;
  let retrying = 0;
  for (const item of receipts) {
    const result =
      providerCategory === 'ok'
        ? classifyExpoReceipt(providerReceipts[item.ticket_id])
        : {
            delivered: false,
            permanentFailure: false,
            category:
              providerCategory === 'network' ? 'network' : providerCategory,
          };
    await admin.rpc('complete_expo_push_receipt', {
      target_ticket: item.ticket_id,
      target_lease: item.lease_token,
      delivered: result.delivered,
      permanent_failure: result.permanentFailure,
      result_provider_category: result.category,
    });
    if (result.delivered) delivered += 1;
    else if (result.permanentFailure) disabled += 1;
    else retrying += 1;
  }

  const succeeded = retrying === 0;
  const finalCategory = succeeded
    ? 'accepted'
    : providerCategory === 'ok'
      ? 'provider_error'
      : providerCategory;
  await finishWorkerRun(admin, workerRun, {
    succeeded,
    retryable: !succeeded && finalCategory !== 'auth',
    detail: `claimed=${receipts.length};delivered=${delivered};disabled=${disabled};retrying=${retrying}`,
    providerCategory: finalCategory,
  });
  return jsonResponse(
    { claimed: receipts.length, delivered, disabled, retrying },
    succeeded ? 200 : 502
  );
});
