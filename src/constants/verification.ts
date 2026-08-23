/**
 * Parameters from docs/VERIFICATION_POLICY.md.
 *
 * Not constitutional — the constitution fixes what the draw may consider, and
 * this is about who has proved they are a person. It can be tightened without
 * an amendment; `tests/verification-policy.test.ts` asserts it still matches
 * the migration that enforces it.
 */

/**
 * How old an account must be before it can enter the pool.
 *
 * Enforced in `refresh_selection_eligibility`, which is the only thing that
 * writes `selection_eligible`. Mirrored here so the app can tell somebody how
 * much longer they are waiting instead of implying they have something left to
 * do.
 */
export const MIN_ACCOUNT_AGE_DAYS = 7;

/** UTC hour at which the nightly refresh judges the pool. */
export const ELIGIBILITY_REFRESH_HOUR_UTC = 23;
