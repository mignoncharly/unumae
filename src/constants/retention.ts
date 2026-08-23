/**
 * The thresholds that decide whether we buy users.
 *
 * The plan is blunt about this: if D1 is bad, we spend nothing on growth and
 * fix the product instead. That only means anything if the number is fixed
 * before we see the result, so it lives here and in the migration
 * 20260823070000_founding_and_retention.sql, and tests/retention-schema.test.ts
 * asserts the two agree. Moving one means moving both, on purpose.
 *
 * These are not conservative-by-accident. A daily ritual that people do not
 * return to the next day is not a daily ritual, whatever the install count
 * says.
 */

/** Percent of a cohort that comes back the day after they arrive. */
export const D1_RETENTION_THRESHOLD = 25;

/** Percent still there on day seven. */
export const D7_RETENTION_THRESHOLD = 10;

/** Percent of viewers who ask, vote, Remember or share rather than only watch. */
export const PARTICIPATION_THRESHOLD = 15;

/** Percent of viewers who send a portrait out of the app. */
export const SHARE_RATE_THRESHOLD = 3;

/** Days of history the gate reads. Four weeks, so a bad week cannot pass it. */
export const GATE_WINDOW_DAYS = 28;

export const GROWTH_GATE_THRESHOLDS = {
  d1_retention: D1_RETENTION_THRESHOLD,
  d7_retention: D7_RETENTION_THRESHOLD,
  participation: PARTICIPATION_THRESHOLD,
  share_rate: SHARE_RATE_THRESHOLD,
} as const;

export type GrowthGateCheck = keyof typeof GROWTH_GATE_THRESHOLDS;
