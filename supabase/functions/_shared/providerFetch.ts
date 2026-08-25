export type ProviderFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

export type ProviderTransportCategory = 'ok' | 'timeout' | 'network';

export interface ProviderFetchResult {
  response: Response | null;
  category: ProviderTransportCategory;
}

/** Fetch with a hard deadline and a non-sensitive transport category. */
export async function fetchWithTimeout(
  input: string | URL | Request,
  init: RequestInit,
  timeoutMs = 10_000,
  fetcher: ProviderFetch = fetch
): Promise<ProviderFetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return {
      response: await fetcher(input, { ...init, signal: controller.signal }),
      category: 'ok',
    };
  } catch {
    return {
      response: null,
      category: controller.signal.aborted ? 'timeout' : 'network',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Provider calls must have a bounded lifetime. A null response is deliberately
 * retryable by the caller and never carries a raw provider error into storage.
 */
export async function fetchProvider(
  input: string | URL | Request,
  init: RequestInit,
  timeoutMs = 10_000,
  fetcher: ProviderFetch = fetch
): Promise<Response | null> {
  return (await fetchWithTimeout(input, init, timeoutMs, fetcher)).response;
}
