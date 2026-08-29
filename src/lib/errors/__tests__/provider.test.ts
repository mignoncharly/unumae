import * as FileSystem from 'expo-file-system';

import { getAnalyticsSessionToken } from '@/lib/analytics/session';
import { getSupabase } from '@/lib/supabase';

import { buildCrashProperties, createSupabaseCrashReporter } from '../provider';
import type { CrashReport } from '../reporter';

jest.mock('@/lib/analytics/session', () => ({
  getAnalyticsSessionToken: jest.fn(),
}));
jest.mock('@/lib/supabase', () => ({
  getSupabase: jest.fn(),
}));
jest.mock('expo-file-system', () => {
  const files = new Map<string, string>();

  class MockFile {
    private readonly path: string;

    constructor(...parts: unknown[]) {
      this.path = parts.map(String).join('/');
    }

    get exists(): boolean {
      return files.has(this.path);
    }

    create(): void {
      files.set(this.path, '');
    }

    write(value: string): void {
      files.set(this.path, value);
    }

    textSync(): string {
      const value = files.get(this.path);
      if (value === undefined) throw new Error('missing file');
      return value;
    }

    delete(): void {
      files.delete(this.path);
    }
  }

  return {
    File: MockFile,
    Paths: { cache: 'cache' },
    __resetFiles: () => files.clear(),
  };
});

const mockSession = getAnalyticsSessionToken as jest.MockedFunction<
  typeof getAnalyticsSessionToken
>;
const mockSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;
const invoke = jest.fn();
const resetFiles = (
  FileSystem as typeof FileSystem & { __resetFiles: () => void }
).__resetFiles;

function crash(overrides: Partial<CrashReport> = {}): CrashReport {
  return {
    name: 'TypeError',
    message: 'undefined is not an object',
    stack: 'TypeError: undefined is not an object\n at PortraitScreen',
    kind: 'unknown',
    scope: 'render',
    fatal: true,
    ...overrides,
  };
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('first-party crash provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetFiles();
    mockSession.mockResolvedValue('attested-session');
    invoke.mockResolvedValue({ data: null, error: null });
    mockSupabase.mockReturnValue({
      functions: { invoke },
    } as unknown as ReturnType<typeof getSupabase>);
  });

  it('keeps the ingestion properties flat and below the server limit', () => {
    const properties = buildCrashProperties(
      crash({
        message: 'm'.repeat(2_000),
        stack: 's'.repeat(2_000),
        context: Object.fromEntries(
          Array.from({ length: 20 }, (_, index) => [
            `long context ${index}`,
            'v'.repeat(500),
          ])
        ),
      }),
      { platform: 'ios', appVersion: '1.2.3' }
    );

    expect(JSON.stringify(properties).length).toBeLessThanOrEqual(1024);
    expect(properties).toMatchObject({
      kind: 'unknown',
      scope: 'render',
      fatal: true,
      platform: 'ios',
      app_version: '1.2.3',
    });
    expect(
      Object.values(properties).every(
        (value) => value === null || typeof value !== 'object'
      )
    ).toBe(true);
  });

  it('sends immediately through the attested first-party endpoint', async () => {
    createSupabaseCrashReporter().report(crash());
    await settle();

    expect(invoke).toHaveBeenCalledWith('analytics-ingest', {
      headers: { 'X-Installation-Session': 'attested-session' },
      body: {
        events: [
          expect.objectContaining({
            event: 'client_crash',
            properties: expect.objectContaining({ name: 'TypeError' }),
          }),
        ],
      },
    });
  });

  it('drops duplicates and reports without an attested session', async () => {
    const reporter = createSupabaseCrashReporter();
    const report = crash();
    reporter.report(report);
    reporter.report(report);
    await settle();
    expect(invoke).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();
    mockSession.mockResolvedValue(null);
    createSupabaseCrashReporter().report(crash({ message: 'different' }));
    await settle();
    expect(mockSupabase).not.toHaveBeenCalled();
  });

  it('replays one redacted fatal report after a process restart', async () => {
    mockSession.mockResolvedValue(null);
    createSupabaseCrashReporter().report(crash());
    await settle();
    expect(invoke).not.toHaveBeenCalled();

    mockSession.mockResolvedValue('attested-session');
    createSupabaseCrashReporter();
    await settle();
    expect(invoke).toHaveBeenCalledTimes(1);

    createSupabaseCrashReporter();
    await settle();
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('caps crash-loop traffic and swallows transport failures', async () => {
    invoke.mockRejectedValue(new Error('offline'));
    const reporter = createSupabaseCrashReporter();

    expect(() => {
      for (let index = 0; index < 12; index += 1) {
        reporter.report(crash({ message: `crash ${index}` }));
      }
    }).not.toThrow();
    await settle();

    expect(invoke).toHaveBeenCalledTimes(10);
  });
});
