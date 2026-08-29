import type { ErrorUtils as ErrorUtilsType } from 'react-native';

import { redact } from './redact';

import { toAppError, type ErrorKind } from './index';

declare const ErrorUtils: ErrorUtilsType;

/**
 * Where a crash was caught. Worth distinguishing: a render throw takes a
 * screen down and the person sees it, an unhandled rejection usually does not,
 * and the two need different urgency when they show up in a report.
 */
export type CrashScope =
  'render' | 'uncaught' | 'unhandled-rejection' | 'handled';

/** Flat scalars only, for the same reason as AnalyticsProperties. */
export type CrashContext = Record<string, string | number | boolean | null>;

export interface CrashReport {
  readonly name: string;
  /** Redacted. Never assume this is safe to show a user — it is not. */
  readonly message: string;
  readonly stack?: string;
  readonly kind: ErrorKind;
  readonly scope: CrashScope;
  readonly fatal: boolean;
  readonly context?: CrashContext;
}

export interface CrashReporter {
  report(report: CrashReport): void;
}

const MAX_CONTEXT_ENTRIES = 8;
const MAX_CONTEXT_KEY_LENGTH = 64;
const MAX_CONTEXT_VALUE_LENGTH = 240;

function redactContext(context: CrashContext): CrashContext {
  const clean: CrashContext = Object.create(null) as CrashContext;

  for (const [key, value] of Object.entries(context).slice(
    0,
    MAX_CONTEXT_ENTRIES
  )) {
    const safeKey = redact(key).slice(0, MAX_CONTEXT_KEY_LENGTH);
    if (!safeKey) continue;
    clean[safeKey] =
      typeof value === 'string'
        ? redact(value).slice(0, MAX_CONTEXT_VALUE_LENGTH)
        : value;
  }

  return clean;
}

/**
 * Safe default for tests and modules loaded outside the application root.
 * Production explicitly swaps in the first-party provider; adding any external
 * crash SDK would require a separate privacy review.
 */
const noopReporter: CrashReporter = {
  report: () => {},
};

let reporter: CrashReporter = noopReporter;

export function setCrashReporter(next: CrashReporter): void {
  reporter = next;
}

/** Test seam, and the way to turn reporting back off. */
export function resetCrashReporter(): void {
  reporter = noopReporter;
}

/**
 * Records a crash. Never throws, whatever the reporter does.
 *
 * A reporter that can break the app has its priorities backwards in exactly
 * the way the analytics provider documents, so the failure of a report is
 * swallowed the same way.
 */
export function reportCrash(
  error: unknown,
  options: { scope: CrashScope; fatal?: boolean; context?: CrashContext } = {
    scope: 'handled',
  }
): void {
  try {
    const appError = toAppError(error);
    const original = appError.cause instanceof Error ? appError.cause : null;
    const source = original ?? appError;

    reporter.report({
      name: source.name || 'Error',
      message: redact(String(source.message ?? '')),
      ...(source.stack ? { stack: redact(source.stack) } : {}),
      kind: appError.kind,
      scope: options.scope,
      fatal: options.fatal ?? options.scope !== 'handled',
      ...(options.context ? { context: redactContext(options.context) } : {}),
    });
  } catch {
    // A reporter must never be the reason a crash becomes two crashes.
  }
}

let installed = false;

/**
 * Catches what an error boundary structurally cannot: a throw from an event
 * handler, a timer, or a promise nobody awaited. React only recovers a render,
 * so without this the majority of production failures leave no trace at all.
 *
 * Chains the existing handler rather than replacing it, so the LogBox redbox
 * still appears in development.
 */
export function installGlobalErrorHandlers(): () => void {
  if (installed) return () => {};
  installed = true;

  const previous =
    typeof ErrorUtils !== 'undefined' ? ErrorUtils.getGlobalHandler() : null;

  if (typeof ErrorUtils !== 'undefined') {
    ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      reportCrash(error, { scope: 'uncaught', fatal: isFatal ?? true });
      previous?.(error, isFatal);
    });
  }

  // Hermes surfaces these through a global hook rather than an event.
  const hermes = globalThis as {
    HermesInternal?: {
      enablePromiseRejectionTracker?: (options: {
        allRejections: boolean;
        onUnhandled: (id: number, rejection: unknown) => void;
      }) => void;
    };
  };
  hermes.HermesInternal?.enablePromiseRejectionTracker?.({
    allRejections: true,
    onUnhandled: (_id, rejection) => {
      reportCrash(rejection, { scope: 'unhandled-rejection', fatal: false });
    },
  });

  return () => {
    if (typeof ErrorUtils !== 'undefined' && previous) {
      ErrorUtils.setGlobalHandler(previous);
    }
    installed = false;
  };
}

/** Test seam. */
export function resetGlobalErrorHandlers(): void {
  installed = false;
}
