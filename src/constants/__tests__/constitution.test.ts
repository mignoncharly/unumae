import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ACCEPTANCE_WINDOW_HOURS,
  BACKUP_CANDIDATE_COUNT,
  CANONICAL_LOCALE,
  CYCLE_DURATION_HOURS,
  CYCLE_TIMEZONE,
  DOWNVOTE_ENABLED,
  HUMANS_PER_CYCLE,
  MIN_ACCOUNT_AGE,
  POOL_FREEZE_DAYS_BEFORE,
  PORTRAIT_ELEMENTS_MAX,
  PORTRAIT_ELEMENTS_MIN,
  QUESTION_MAX_LENGTH,
  QUIET_DAY_CUTOFF_HOUR_UTC,
  REMEMBER_COUNT_PUBLIC,
  RESELECTION_ALLOWED,
  SUPPORTED_LOCALES,
} from '../constitution';

const CONSTITUTION = readFileSync(
  join(__dirname, '..', '..', '..', 'docs', 'PRODUCT_CONSTITUTION.md'),
  'utf8'
);

/**
 * Column padding and line wrapping are formatting, not meaning. These tests
 * must fail when a *value* changes, not when someone reflows a table.
 */
const SINGLE_SPACED = CONSTITUTION.replace(/[ \t]+/g, ' ');
const UNWRAPPED = CONSTITUTION.replace(/\s+/g, ' ');

/**
 * These constants are not configuration. Changing one is an amendment to the
 * Product Constitution, so the code and the document are asserted against each
 * other — changing either alone fails here.
 */
describe('constitution parameters match the document', () => {
  it('Appendix B still lists every parameter this file defines', () => {
    const appendixB = SINGLE_SPACED.split('## Appendix B')[1] ?? '';
    expect(appendixB).toContain(
      '| Cycle clock | 00:00 UTC, one global window |'
    );
    expect(appendixB).toContain(`| Minimum account age | ${MIN_ACCOUNT_AGE} |`);
    expect(appendixB).toContain('| Re-selection | Never |');
    expect(appendixB).toContain(
      `| Acceptance window | ${ACCEPTANCE_WINDOW_HOURS} hours |`
    );
    expect(appendixB).toContain(
      `| Backup candidates | ${BACKUP_CANDIDATE_COUNT}, then emergency re-draw |`
    );
    expect(appendixB).toContain(
      `| Question length | ${QUESTION_MAX_LENGTH} characters |`
    );
    expect(appendixB).toContain(
      `| Portrait elements at MVP | ${PORTRAIT_ELEMENTS_MIN}–${PORTRAIT_ELEMENTS_MAX} of 9 |`
    );
  });

  it('keeps the cycle global and 24 hours (Article 4.1)', () => {
    expect(CYCLE_TIMEZONE).toBe('UTC');
    expect(CYCLE_DURATION_HOURS).toBe(24);
    expect(POOL_FREEZE_DAYS_BEFORE).toBe(2);
    expect(QUIET_DAY_CUTOFF_HOUR_UTC).toBe(22);
  });

  it('keeps exactly one human per cycle (Article 1.6)', () => {
    expect(HUMANS_PER_CYCLE).toBe(1);
  });

  it('never allows re-selection (Article 5.4)', () => {
    expect(RESELECTION_ALLOWED).toBe(false);
  });

  it('never allows a downvote (Article 9.3)', () => {
    expect(DOWNVOTE_ENABLED).toBe(false);
  });

  it('never makes the Remember count public (Article 9.4)', () => {
    expect(REMEMBER_COUNT_PUBLIC).toBe(false);
  });

  it('keeps the minimum age at or above 16 (Article 8.4)', () => {
    // May be raised. May never be lowered without amending Article 8.4.
    expect(MIN_ACCOUNT_AGE).toBeGreaterThanOrEqual(16);
  });

  it('ships English, French and German with English canonical (Article 9.6)', () => {
    expect(CANONICAL_LOCALE).toBe('en');
    expect([...SUPPORTED_LOCALES]).toEqual(['en', 'fr', 'de']);
  });
});

/**
 * Article 1 cannot be amended. If someone deletes a principle, this fails.
 */
describe('Article 1 is intact', () => {
  const NON_NEGOTIABLES = [
    '**No followers.**',
    '**No popularity contest.**',
    '**No paying for a better chance.**',
    '**No priority for influencers.**',
    '**An equal chance among eligible users.**',
    '**One principal human per cycle.**',
    '**Discovery before infinite consumption.**',
    '**Human content before viral content.**',
    '**A permanent archive.**',
    '**International from day one.**',
    '**Protection against bots and fraud.**',
    '**Moderation before publication.**',
    '**Extremely simple design.**',
    '**No TikTok-style feed.**',
  ];

  it.each(NON_NEGOTIABLES)('still states %s', (principle) => {
    expect(CONSTITUTION).toContain(principle);
  });

  it('still declares itself unamendable', () => {
    expect(UNWRAPPED).toContain('**Article 1 cannot be amended.**');
  });
});
