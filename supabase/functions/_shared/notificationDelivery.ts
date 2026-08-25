export interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  details?: { error?: string };
}

export interface ExpoDelivery {
  succeeded: boolean;
  providerReference?: string;
  failureCode?: string;
}

/** A partial provider response fails only its missing/error entries. */
export function classifyExpoTickets(
  targetCount: number,
  tickets: ExpoTicket[]
): ExpoDelivery[] {
  return Array.from({ length: targetCount }, (_, index) => {
    const ticket = tickets[index];
    const succeeded = ticket?.status === 'ok';
    return {
      succeeded,
      providerReference: ticket?.id,
      failureCode: succeeded
        ? undefined
        : (ticket?.details?.error ?? 'expo_ticket_missing'),
    };
  });
}
