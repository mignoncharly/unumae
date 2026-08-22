/**
 * Parameters fixed by the Product Constitution, Appendix B.
 *
 * These are not configuration. Changing a value here is an amendment to
 * docs/PRODUCT_CONSTITUTION.md and must be accompanied by an entry in its
 * Amendment Log (Article 13).
 *
 * src/constants/__tests__/constitution.test.ts asserts that every value below
 * still matches the document. If you change one without the other, tests fail.
 */

/** Article 4.1 — one single global cycle, never per-user local midnight. */
export const CYCLE_TIMEZONE = 'UTC' as const;

/** Article 4.1 — exactly 24 hours, 00:00:00 to 23:59:59 UTC. */
export const CYCLE_DURATION_HOURS = 24;

/** Article 1.6 — exactly one principal human per cycle. Never two. */
export const HUMANS_PER_CYCLE = 1;

/** Article 8.4 — minimum age to hold an account. May be raised, never lowered. */
export const MIN_ACCOUNT_AGE = 16;

/** Article 5.5 — hours a selected candidate has to accept. */
export const ACCEPTANCE_WINDOW_HOURS = 12;

/** Article 5.2 — backups drawn alongside the primary, in order. */
export const BACKUP_CANDIDATE_COUNT = 3;

/** Article 5.2 — the pool is frozen this many days before the cycle. */
export const POOL_FREEZE_DAYS_BEFORE = 2;

/** Article 5.8 — after this UTC hour on D-1, an unfilled cycle is a Quiet Day. */
export const QUIET_DAY_CUTOFF_HOUR_UTC = 22;

/** Article 9.1 — portrait elements requested at MVP, out of the nine available. */
export const PORTRAIT_ELEMENTS_MIN = 5;
export const PORTRAIT_ELEMENTS_MAX = 7;
export const PORTRAIT_ELEMENTS_AVAILABLE = 9;

/** Article 9.2 — short questions produce answerable questions. */
export const QUESTION_MAX_LENGTH = 180;

/** Article 9.3 — upvote only. There is no downvote, and there never will be. */
export const DOWNVOTE_ENABLED = false;

/** Article 9.4 — the Remember count is never public. */
export const REMEMBER_COUNT_PUBLIC = false;

/** Article 5.4 — one human, one day, forever. No cooldown, no second turn. */
export const RESELECTION_ALLOWED = false;

/** Article 9.6 — English is canonical; in any conflict the English text governs. */
export const CANONICAL_LOCALE = 'en' as const;
export const SUPPORTED_LOCALES = ['en', 'fr', 'de'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Article 7.2 — columns forbidden in the database schema.
 * scripts/verify-migrations.mjs rejects any migration introducing one.
 */
export const FORBIDDEN_SCHEMA_COLUMNS = [
  'followers',
  'following',
  'popularity_score',
  'likes_received',
  'engagement_score',
  'reach',
] as const;
