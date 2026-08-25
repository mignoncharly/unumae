import { classifyExpoTickets } from './notificationDelivery.ts';

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
      deliveries[1].failureCode !== 'DeviceNotRegistered'
    ) {
      throw new Error('provider-declared failure was not classified');
    }
    if (
      deliveries[2].succeeded ||
      deliveries[2].failureCode !== 'expo_ticket_missing'
    ) {
      throw new Error('missing partial response must remain retryable');
    }
  }
);
