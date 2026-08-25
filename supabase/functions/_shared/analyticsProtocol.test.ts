import { parseAnalyticsEnvelope } from './analyticsProtocol.ts';

Deno.test('accepts bounded app and identifier-free marketing events', () => {
  if (!parseAnalyticsEnvelope({ events: [{ event: 'app_opened' }] }))
    throw new Error('app event rejected');
  const marketing = parseAnalyticsEnvelope({
    event: 'archive_opened',
    locale: 'de',
    source: 'home',
  });
  if (
    !marketing?.marketingOnly ||
    'installId' in marketing.events[0].properties
  )
    throw new Error('marketing event rejected');
});

Deno.test(
  'rejects unknown, oversized, and identifying marketing payloads',
  () => {
    if (
      parseAnalyticsEnvelope({
        event: 'human_viewed',
        locale: 'en',
        source: 'home',
      })
    )
      throw new Error('unknown marketing event accepted');
    if (
      parseAnalyticsEnvelope({
        events: Array.from({ length: 21 }, () => ({ event: 'app_opened' })),
      })
    )
      throw new Error('oversized batch accepted');
    if (
      parseAnalyticsEnvelope({
        event: 'archive_opened',
        locale: 'en',
        source: 'home',
        installId: 'client-id',
      })?.events[0].properties.installId
    )
      throw new Error('identifier propagated');
  }
);
