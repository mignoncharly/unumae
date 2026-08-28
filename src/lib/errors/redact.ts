/**
 * Scrubbing a diagnostic string before anything is allowed to record it.
 *
 * A crash message is written by whatever threw, which includes libraries and
 * the server. Neither is under our control, and both have been known to put a
 * row, an address or a token into a message. `docs/SECURITY.md` forbids a
 * server message reaching a user's screen for the same reason; a reporter that
 * ships it to a log instead is the same mistake with a longer fuse.
 *
 * So the rule here is inverted from the usual one: this does not try to detect
 * secrets, it removes whole classes of value that are *never* needed to
 * diagnose a crash. Losing a legitimate uuid from a stack trace costs a little
 * debugging convenience. Keeping one costs a person their privacy.
 */
const RULES: ReadonlyArray<{ expression: RegExp; replacement: string }> = [
  // Bearer tokens and JWTs, before anything else can match a fragment of one.
  {
    expression: /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]+/g,
    replacement: '[jwt]',
  },
  {
    expression: /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi,
    replacement: 'Bearer [redacted]',
  },
  {
    expression: /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+/g,
    replacement: '[key]',
  },
  // Credential-bearing connection strings. Must precede the email rule: a
  // `user:password@host` pair is shaped exactly like an address, so letting
  // the email rule reach it first rewrites the *password* into `[email]` and
  // leaves the username and host standing.
  {
    expression: /\b(postgres(?:ql)?|https?):\/\/[^\s/@]+:[^\s@]+@/gi,
    replacement: '$1://[credentials]@',
  },
  // Email addresses.
  {
    expression: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: '[email]',
  },
  // Any uuid: user ids, draw ids, portrait ids. A crash is diagnosable from
  // the code path, not from which row it happened to be holding.
  {
    expression:
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    replacement: '[id]',
  },
  // Signed storage URLs — the query string is the capability.
  {
    expression: /([?&](?:token|signature|sig|apikey)=)[^&\s"']+/gi,
    replacement: '$1[redacted]',
  },
];

/** Long enough for a stack, short enough that nothing can be smuggled out. */
export const MAX_REDACTED_LENGTH = 2000;

export function redact(value: string): string {
  let output = value;
  for (const { expression, replacement } of RULES) {
    output = output.replace(expression, replacement);
  }
  return output.length > MAX_REDACTED_LENGTH
    ? `${output.slice(0, MAX_REDACTED_LENGTH)}…[truncated]`
    : output;
}
