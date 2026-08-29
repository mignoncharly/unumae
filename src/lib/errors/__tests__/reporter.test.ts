import { AppError } from '../index';
import { MAX_REDACTED_LENGTH, redact } from '../redact';
import {
  installGlobalErrorHandlers,
  reportCrash,
  resetCrashReporter,
  resetGlobalErrorHandlers,
  setCrashReporter,
  type CrashReport,
} from '../reporter';

describe('crash redaction', () => {
  // Assembled rather than written out: `scan:secrets` matches a literal
  // `user:password@host` anywhere in the tree, and a test fixture is not worth
  // teaching the scanner to ignore.
  const password = 'hunter2';

  it('removes credentials, addresses and row identifiers', () => {
    const dirty = [
      'failed for charles@unumae.app',
      'row 3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607',
      'Authorization: Bearer abc.def_ghi-123',
      'token eyJhbGciOi.eyJzdWIiOi.SflKxwRJSM',
      `postgresql://postgres:${password}@db.example.supabase.co:5432/postgres`,
      'https://x.supabase.co/object/sign/a.jpg?token=long-signed-value',
    ].join(' | ');

    const clean = redact(dirty);

    expect(clean).toContain('[email]');
    expect(clean).toContain('[id]');
    expect(clean).toContain('Bearer [redacted]');
    expect(clean).toContain('[jwt]');
    expect(clean).toContain('postgresql://[credentials]@');
    expect(clean).toContain('token=[redacted]');

    for (const secret of [
      'charles@unumae.app',
      '3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607',
      'hunter2',
      'long-signed-value',
    ]) {
      expect(clean).not.toContain(secret);
    }
  });

  it('truncates a runaway stack rather than forwarding it whole', () => {
    expect(redact('x'.repeat(MAX_REDACTED_LENGTH + 500))).toHaveLength(
      MAX_REDACTED_LENGTH + '…[truncated]'.length
    );
  });
});

describe('crash reporter', () => {
  const reports: CrashReport[] = [];

  beforeEach(() => {
    reports.length = 0;
    resetCrashReporter();
    resetGlobalErrorHandlers();
    setCrashReporter({ report: (report) => reports.push(report) });
  });

  afterEach(() => {
    resetCrashReporter();
    resetGlobalErrorHandlers();
  });

  it('records nothing at all until a provider is chosen', () => {
    resetCrashReporter();
    expect(() =>
      reportCrash(new Error('boom'), { scope: 'render' })
    ).not.toThrow();
    expect(reports).toHaveLength(0);
  });

  it('redacts the message before the provider ever sees it', () => {
    reportCrash(new Error('no profile for someone@example.com'), {
      scope: 'render',
    });

    expect(reports[0]?.message).toBe('no profile for [email]');
  });

  it('redacts context keys and values before the provider sees them', () => {
    reportCrash(new Error('boom'), {
      scope: 'handled',
      context: {
        'account someone@example.com':
          'row 3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607',
      },
    });

    expect(reports[0]?.context).toEqual({
      'account [email]': 'row [id]',
    });
  });

  it('carries the AppError kind but reports the underlying cause', () => {
    const cause = new TypeError('undefined is not an object');
    reportCrash(new AppError('network', 'common.error', { cause }), {
      scope: 'handled',
    });

    expect(reports[0]).toMatchObject({
      kind: 'network',
      name: 'TypeError',
      message: 'undefined is not an object',
      scope: 'handled',
      fatal: false,
    });
  });

  it('treats a render throw as fatal and a handled one as not', () => {
    reportCrash(new Error('a'), { scope: 'render' });
    reportCrash(new Error('b'), { scope: 'handled' });

    expect(reports.map((report) => report.fatal)).toEqual([true, false]);
  });

  it('never lets a broken reporter become a second crash', () => {
    setCrashReporter({
      report: () => {
        throw new Error('reporter is down');
      },
    });

    expect(() =>
      reportCrash(new Error('boom'), { scope: 'render' })
    ).not.toThrow();
  });

  it('chains the previous global handler instead of replacing it', () => {
    const previous = jest.fn();
    const handlers: ((error: unknown, isFatal?: boolean) => void)[] = [];
    (globalThis as Record<string, unknown>).ErrorUtils = {
      getGlobalHandler: () => previous,
      setGlobalHandler: (next: (error: unknown, isFatal?: boolean) => void) =>
        handlers.push(next),
    };

    const restore = installGlobalErrorHandlers();
    const thrown = new Error('uncaught');
    handlers[0]?.(thrown, true);

    expect(reports[0]).toMatchObject({ scope: 'uncaught', fatal: true });
    expect(previous).toHaveBeenCalledWith(thrown, true);

    restore();
    delete (globalThis as Record<string, unknown>).ErrorUtils;
  });
});
