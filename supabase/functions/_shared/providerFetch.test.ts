import {
  fetchProvider,
  fetchWithTimeout,
  type ProviderFetch,
} from './providerFetch.ts';

Deno.test('provider calls return successful responses', async () => {
  const fetcher: ProviderFetch = async () =>
    new Response('ok', { status: 200 });
  const response = await fetchProvider(
    'https://provider.invalid',
    {},
    50,
    fetcher
  );
  if (response?.status !== 200) throw new Error('expected provider response');
});

Deno.test('provider timeouts become retryable null responses', async () => {
  const fetcher: ProviderFetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () =>
        reject(new DOMException('aborted', 'AbortError'))
      );
    });
  const response = await fetchProvider(
    'https://provider.invalid',
    {},
    5,
    fetcher
  );
  if (response !== null)
    throw new Error('timeout must not escape as a response');
});

Deno.test(
  'fetchWithTimeout records only a bounded failure category',
  async () => {
    const fetcher: ProviderFetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new Error('secret'))
        );
      });
    const result = await fetchWithTimeout(
      'https://provider.invalid/private-content',
      {},
      5,
      fetcher
    );
    if (result.response !== null || result.category !== 'timeout')
      throw new Error('timeout was not safely categorized');
  }
);
