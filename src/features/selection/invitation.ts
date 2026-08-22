import { ACCEPTANCE_WINDOW_HOURS } from '@/constants/constitution';

/**
 * The 12-hour acceptance window (Article 5.5), as pure functions.
 *
 * The wording matters as much as the arithmetic here. At this point the
 * message is "You were selected." and never "You are Today's Human" — nothing
 * has been written and nothing has been reviewed, so the second sentence would
 * be a promise the product has not yet kept.
 */

export interface PendingInvitation {
  invitationId: string;
  /** The cycle this invitation is for — two days out, not today. */
  selectionDate: string;
  notifiedAt: string;
  acceptanceDeadline: string;
}

export type InvitationState =
  | 'none'
  /** Asked, still inside the window, no answer yet. */
  | 'awaiting'
  /** Answered yes; the portrait comes next (Phase 6). */
  | 'accepted'
  /** The window closed. The next candidate has already been asked. */
  | 'expired';

export interface InvitationTimeLeft {
  hours: number;
  minutes: number;
  totalMs: number;
  expired: boolean;
  /** Under two hours. Used to change tone, never to nag. */
  urgent: boolean;
}

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const URGENT_THRESHOLD_MS = 2 * MS_PER_HOUR;

export function timeLeftToAccept(
  acceptanceDeadline: string,
  now: Date = new Date()
): InvitationTimeLeft {
  const totalMs = Math.max(
    0,
    new Date(acceptanceDeadline).getTime() - now.getTime()
  );

  return {
    hours: Math.floor(totalMs / MS_PER_HOUR),
    minutes: Math.floor((totalMs % MS_PER_HOUR) / MS_PER_MINUTE),
    totalMs,
    expired: totalMs === 0,
    urgent: totalMs > 0 && totalMs <= URGENT_THRESHOLD_MS,
  };
}

/** `11h 43m` — coarser than the cycle countdown, because 12 hours is not a race. */
export function formatTimeLeft(left: InvitationTimeLeft): string {
  return `${left.hours}h ${String(left.minutes).padStart(2, '0')}m`;
}

/**
 * The deadline the server will enforce. Computed client-side only to show a
 * countdown; the database sets and checks the real one.
 */
export function expectedDeadline(notifiedAt: string): Date {
  return new Date(
    new Date(notifiedAt).getTime() + ACCEPTANCE_WINDOW_HOURS * MS_PER_HOUR
  );
}

/**
 * Declining must cost nothing (Article 5.6), so nothing here computes a
 * penalty, a strike, or a reduced future chance. There is deliberately no
 * function to do so.
 */
export const DECLINING_HAS_NO_CONSEQUENCE = true;
