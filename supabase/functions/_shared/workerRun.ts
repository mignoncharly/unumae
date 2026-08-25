interface RpcResult {
  data: unknown;
  error: { message?: string } | null;
}

interface RpcClient {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<RpcResult>;
}

export interface WorkerInvocation {
  jobRunId?: number;
  leaseToken?: string;
}

export interface WorkerRun {
  id: number;
  leaseToken: string;
}

/** Validate or acquire the durable lease for one Edge worker invocation. */
export async function startWorkerRun(
  client: RpcClient,
  payload: WorkerInvocation,
  job: string
): Promise<WorkerRun | null> {
  if (!Number.isInteger(payload.jobRunId)) return null;
  const { data, error } = await client.rpc('claim_worker_run', {
    target_run: payload.jobRunId,
    target_job: job,
    presented_lease: payload.leaseToken ?? null,
  });
  return error || typeof data !== 'string'
    ? null
    : { id: payload.jobRunId as number, leaseToken: data };
}

export async function finishWorkerRun(
  client: RpcClient,
  run: WorkerRun,
  outcome: {
    succeeded: boolean;
    retryable?: boolean;
    detail: string;
    providerCategory?: string;
  }
): Promise<boolean> {
  const { data, error } = await client.rpc('complete_worker_run', {
    target_run: run.id,
    target_lease: run.leaseToken,
    succeeded: outcome.succeeded,
    retryable: outcome.retryable ?? false,
    result_detail: outcome.detail,
    result_provider_category: outcome.providerCategory ?? null,
  });
  return !error && data === true;
}
