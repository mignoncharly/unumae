import { fetchProvider, type ProviderFetch } from './providerFetch.ts';

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
