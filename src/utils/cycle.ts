/**
 * Cycle arithmetic — Product Constitution, Article 4.
 *
 * One single global window: 00:00:00 → 23:59:59 UTC. The cycle does not roll
 * by timezone and does not begin at each user's local midnight. Every function
 * here works in UTC; local time is a presentation concern only.
 */

import {
  ACCEPTANCE_WINDOW_HOURS,
  CYCLE_DURATION_HOURS,
  POOL_FREEZE_DAYS_BEFORE,
  QUIET_DAY_CUTOFF_HOUR_UTC,
} from '@/constants/constitution';

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** A UTC calendar date, `YYYY-MM-DD`. This is the primary key of a cycle. */
export type CycleDate = string;

export interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  /** True once the cycle has ended; the countdown never goes negative. */
  expired: boolean;
}

/** The cycle date that a given instant belongs to. */
export function getCycleDate(now: Date = new Date()): CycleDate {
  const iso = now.toISOString();
  return iso.slice(0, 10);
}

function parseCycleDate(date: CycleDate): Date {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`Invalid cycle date: ${date}`);
  }
  return parsed;
}

/** 00:00:00.000 UTC on the cycle date. */
export function getCycleStart(date: CycleDate): Date {
  return parseCycleDate(date);
}

/**
 * The exclusive upper bound of the cycle: 00:00:00.000 UTC the following day.
 * A cycle owns [start, end).
 */
export function getCycleEnd(date: CycleDate): Date {
  return new Date(
    parseCycleDate(date).getTime() + CYCLE_DURATION_HOURS * MS_PER_HOUR
  );
}

/** Shift a cycle date by whole days, staying in UTC. */
export function shiftCycleDate(date: CycleDate, days: number): CycleDate {
  return getCycleDate(
    new Date(parseCycleDate(date).getTime() + days * MS_PER_DAY)
  );
}

/**
 * When the candidate pool is frozen for a cycle: D-2 at 00:00 UTC (Article 5.2).
 * A user who becomes eligible one minute later waits for tomorrow's pool — this
 * is what makes the draw reproducible.
 */
export function getPoolFreezeAt(date: CycleDate): Date {
  return getCycleStart(shiftCycleDate(date, -POOL_FREEZE_DAYS_BEFORE));
}

/** A selected candidate has 12 hours to accept (Article 5.5). */
export function getAcceptanceDeadline(notifiedAt: Date): Date {
  return new Date(notifiedAt.getTime() + ACCEPTANCE_WINDOW_HOURS * MS_PER_HOUR);
}

/**
 * After this instant, an unfilled cycle becomes a Quiet Day (Article 5.8):
 * 22:00 UTC on D-1.
 */
export function getQuietDayCutoff(date: CycleDate): Date {
  const dayBefore = getCycleStart(shiftCycleDate(date, -1));
  return new Date(
    dayBefore.getTime() + QUIET_DAY_CUTOFF_HOUR_UTC * MS_PER_HOUR
  );
}

/**
 * Time left in the cycle. Identical for every viewer on earth — only its
 * rendering is localised.
 */
export function getTimeRemaining(
  date: CycleDate = getCycleDate(),
  now: Date = new Date()
): TimeRemaining {
  const totalMs = Math.max(0, getCycleEnd(date).getTime() - now.getTime());

  return {
    hours: Math.floor(totalMs / MS_PER_HOUR),
    minutes: Math.floor((totalMs % MS_PER_HOUR) / MS_PER_MINUTE),
    seconds: Math.floor((totalMs % MS_PER_MINUTE) / MS_PER_SECOND),
    totalMs,
    expired: totalMs === 0,
  };
}

/** `18:43:12` — the format shown under a Human's name. */
export function formatCountdown(remaining: TimeRemaining): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(remaining.hours)}:${pad(remaining.minutes)}:${pad(remaining.seconds)}`;
}

/** `HUMAN #0128` — the permanent sequential identifier (Appendix A). */
export function formatHumanNumber(humanNumber: number): string {
  return `HUMAN #${String(humanNumber).padStart(4, '0')}`;
}
