/**
 * A single error shape so that every surface can decide what to show without
 * inspecting library-specific error objects.
 */
export type ErrorKind =
  | 'network'
  | 'auth'
  | 'permission'
  | 'validation'
  | 'not-found'
  | 'rate-limited'
  | 'moderation'
  | 'unknown';

export class AppError extends Error {
  readonly kind: ErrorKind;
  /** i18n key shown to the user. Never a raw message from a server. */
  readonly messageKey: string;
  override readonly cause?: unknown;

  constructor(
    kind: ErrorKind,
    messageKey = 'common.error',
    options?: { cause?: unknown }
  ) {
    super(`${kind}: ${messageKey}`);
    this.name = 'AppError';
    this.kind = kind;
    this.messageKey = messageKey;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  return new AppError('unknown', 'common.error', { cause: error });
}
