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

export interface ExpoReceipt {
  status: 'ok' | 'error';
  details?: { error?: string };
}

const PERMANENT_EXPO_ERRORS = new Set([
  'DeviceNotRegistered',
  'MismatchSenderId',
]);

type ExpoFailureCategory =
  | 'rate_limited'
  | 'auth'
  | 'invalid_request'
  | 'provider_error'
  | 'permanent_destination';

export function normalizeExpoError(
  value: string | undefined
): ExpoFailureCategory {
  if (value === 'DeviceNotRegistered') return 'permanent_destination';
  if (value === 'MessageRateExceeded') return 'rate_limited';
  if (value === 'MismatchSenderId') return 'auth';
  if (value === 'MessageTooBig') return 'invalid_request';
  return 'provider_error';
}

export function classifyExpoReceipt(receipt: ExpoReceipt | undefined): {
  delivered: boolean;
  permanentFailure: boolean;
  category:
    | 'accepted'
    | 'rate_limited'
    | 'auth'
    | 'invalid_request'
    | 'provider_error'
    | 'permanent_destination'
    | 'malformed_response';
} {
  if (!receipt) {
    return {
      delivered: false,
      permanentFailure: false,
      category: 'malformed_response',
    };
  }
  if (receipt.status === 'ok') {
    return { delivered: true, permanentFailure: false, category: 'accepted' };
  }
  const error = receipt.details?.error;
  return {
    delivered: false,
    permanentFailure: error ? PERMANENT_EXPO_ERRORS.has(error) : false,
    category: normalizeExpoError(error),
  };
}

/** A partial provider response fails only its missing/error entries. */
export function classifyExpoTickets(
  targetCount: number,
  tickets: ExpoTicket[]
): ExpoDelivery[] {
  return Array.from({ length: targetCount }, (_, index) => {
    const ticket = tickets[index];
    const succeeded = ticket?.status === 'ok' && typeof ticket.id === 'string';
    return {
      succeeded,
      providerReference: ticket?.id,
      failureCode: succeeded
        ? undefined
        : ticket
          ? normalizeExpoError(ticket.details?.error)
          : 'malformed_response',
    };
  });
}
