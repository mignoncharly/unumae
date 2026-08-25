import {
  classifyExpoReceipt,
  classifyExpoTickets,
} from './notificationDelivery.ts';

Deno.test(
  'partial Expo batches preserve success and retry missing entries',
  () => {
    const deliveries = classifyExpoTickets(3, [
      { status: 'ok', id: 'ticket-1' },
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
    ]);

    if (
      !deliveries[0].succeeded ||
      deliveries[0].providerReference !== 'ticket-1'
    ) {
      throw new Error('successful ticket was not preserved');
    }
    if (
      deliveries[1].succeeded ||
      deliveries[1].failureCode !== 'permanent_destination'
    ) {
      throw new Error('provider-declared failure was not classified');
    }
    if (
      deliveries[2].succeeded ||
      deliveries[2].failureCode !== 'malformed_response'
    ) {
      throw new Error('missing partial response must remain retryable');
    }
  }
);

Deno.test('Expo receipts disable only permanent destinations', () => {
  const gone = classifyExpoReceipt({
    status: 'error',
    details: { error: 'DeviceNotRegistered' },
  });
  const throttled = classifyExpoReceipt({
    status: 'error',
    details: { error: 'MessageRateExceeded' },
  });
  if (!gone.permanentFailure || gone.category !== 'permanent_destination')
    throw new Error('invalid destination was not classified permanently');
  if (throttled.permanentFailure || throttled.category !== 'rate_limited')
    throw new Error('retryable receipt was classified permanently');
});
