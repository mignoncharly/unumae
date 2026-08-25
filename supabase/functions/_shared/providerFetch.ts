export type ProviderFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(input, { ...init, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
