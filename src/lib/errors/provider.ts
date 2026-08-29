import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { getAnalyticsSessionToken } from '@/lib/analytics/session';
import { getSupabase } from '@/lib/supabase';

import type { CrashContext, CrashReport, CrashReporter } from './reporter';

const MAX_REPORTS_PER_SESSION = 10;
const MAX_PROPERTIES_LENGTH = 1024;
const MAX_NAME_LENGTH = 48;
const MAX_MESSAGE_LENGTH = 180;
const MAX_STACK_LENGTH = 360;
const MAX_CONTEXT_ENTRIES = 4;
const MAX_CONTEXT_VALUE_LENGTH = 80;
const MAX_PENDING_LENGTH = 2 * 1024;
const PENDING_FILE_NAME = 'unumae-pending-crash.json';

type CrashProperties = Record<string, string | number | boolean | null>;

interface PendingCrash {
  properties: CrashProperties;
  serialized: string;
}

function truncate(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function contextKey(key: string, index: number): string {
  const normalized = key
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  return `context_${index}_${normalized || 'value'}`;
}

function appendBoundedContext(
  properties: CrashProperties,
  context: CrashContext | undefined
): void {
  if (!context) return;

  for (const [index, [key, rawValue]] of Object.entries(context)
    .slice(0, MAX_CONTEXT_ENTRIES)
    .entries()) {
    const property = contextKey(key, index);
    const value =
      typeof rawValue === 'string'
        ? truncate(rawValue, MAX_CONTEXT_VALUE_LENGTH)
        : rawValue;
    properties[property] = value;

    if (JSON.stringify(properties).length > MAX_PROPERTIES_LENGTH) {
      delete properties[property];
      return;
    }
  }
}

/**
 * Converts an already-redacted report into the deliberately small analytics
 * schema accepted by the Edge Function. Exported as a test seam.
 */
export function buildCrashProperties(
  report: CrashReport,
  runtime: { platform: string; appVersion: string } = {
    platform: Platform.OS,
    appVersion: Constants.expoConfig?.version ?? 'unknown',
  }
): CrashProperties {
  const properties: CrashProperties = {
    name: truncate(report.name, MAX_NAME_LENGTH),
    message: truncate(report.message, MAX_MESSAGE_LENGTH),
    kind: report.kind,
    scope: report.scope,
    fatal: report.fatal,
    platform: truncate(runtime.platform, 16),
    app_version: truncate(runtime.appVersion, 32),
  };

  if (report.stack) {
    properties.stack = truncate(report.stack, MAX_STACK_LENGTH);
  }
  appendBoundedContext(properties, report.context);

  return properties;
}

function fingerprint(report: CrashReport): string {
  return [report.name, report.message, report.stack ?? '', report.scope].join(
    '\u0000'
  );
}

function isCrashProperties(value: unknown): value is CrashProperties {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  if (JSON.stringify(value).length > MAX_PROPERTIES_LENGTH) return false;

  return Object.values(value).every(
    (item) =>
      item === null ||
      typeof item === 'string' ||
      typeof item === 'number' ||
      typeof item === 'boolean'
  );
}

function pendingFile(): File {
  return new File(Paths.cache, PENDING_FILE_NAME);
}

/**
 * Fatal handlers cannot wait for a network promise before the process exits.
 * Keep one already-redacted envelope synchronously in the app cache so the
 * next launch gets another chance to deliver it.
 */
function persistPendingCrash(properties: CrashProperties): string | null {
  try {
    const serialized = JSON.stringify({ version: 1, properties });
    const file = pendingFile();
    file.create({ overwrite: true, intermediates: true });
    file.write(serialized);
    return serialized;
  } catch {
    return null;
  }
}

function readPendingCrash(): PendingCrash | null {
  try {
    const file = pendingFile();
    if (!file.exists) return null;

    const serialized = file.textSync();
    if (serialized.length > MAX_PENDING_LENGTH) {
      file.delete();
      return null;
    }

    const parsed: unknown = JSON.parse(serialized);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('version' in parsed) ||
      parsed.version !== 1 ||
      !('properties' in parsed) ||
      !isCrashProperties(parsed.properties)
    ) {
      file.delete();
      return null;
    }

    return { properties: parsed.properties, serialized };
  } catch {
    return null;
  }
}

function clearPendingCrash(expected: string): void {
  try {
    const file = pendingFile();
    if (file.exists && file.textSync() === expected) {
      file.delete();
    }
  } catch {
    // A stale cache entry is harmless and can be retried next launch.
  }
}

/** First-party crash transport over the existing attested analytics endpoint. */
export function createSupabaseCrashReporter(): CrashReporter {
  const sent = new Set<string>();

  async function send(
    properties: CrashProperties,
    pending: string | null
  ): Promise<void> {
    try {
      const installationSession = await getAnalyticsSessionToken();
      if (!installationSession) return;

      const { error } = await getSupabase().functions.invoke(
        'analytics-ingest',
        {
          headers: { 'X-Installation-Session': installationSession },
          body: {
            events: [{ event: 'client_crash', properties }],
          },
        }
      );
      if (!error && pending) clearPendingCrash(pending);
    } catch {
      // Diagnostics are best effort and must never become another crash.
    }
  }

  const pending = readPendingCrash();
  if (pending) void send(pending.properties, pending.serialized);

  return {
    report(report) {
      if (sent.size >= MAX_REPORTS_PER_SESSION) return;

      const key = fingerprint(report);
      if (sent.has(key)) return;
      sent.add(key);

      const properties = buildCrashProperties(report);
      const persisted = report.fatal ? persistPendingCrash(properties) : null;
      void send(properties, persisted);
    },
  };
}
