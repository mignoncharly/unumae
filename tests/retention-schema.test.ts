import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { GROWTH_GATE_THRESHOLDS } from '@/constants/retention';

const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');

const ALL_SQL = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/comment on [\s\S]*?;/gi, '')
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .toLowerCase();

const FLAT = ALL_SQL.replace(/\s+/g, ' ');

/** The last definition wins — `create or replace` replaces what came before. */
function lastFunctionBody(name: string): string {
  const matches = [
    ...ALL_SQL.matchAll(
      new RegExp(
        `create or replace function public\\.${name}\\b[\\s\\S]*?\\n\\$\\$;`,
        'g'
      )
    ),
  ];

  return matches.at(-1)?.[0] ?? '';
}

/**
 * The badge exists. What it must never become is a way to be drawn more often.
 *
 * The plan's wording is exact — "mais pas avec avantages de sélection" — and a
 * promise like that is worth as much as the structure behind it. So the
 * structure is the test: there is no column to award, and the code that decides
 * who gets drawn has never heard of it.
 */
describe('Founding Humans is a badge, not an advantage', () => {
  it('is derived, never stored', () => {
    // No column means nothing to grant, revoke, sell, or leak into the draw.
    expect(FLAT).not.toMatch(/\bis_founding\b\s+boolean/);
    expect(FLAT).not.toMatch(/\bfounding\b\s+boolean\s+(not\s+null|default)/);
    expect(FLAT).not.toContain(
      'alter table public.profiles add column founding'
    );
  });

  it('is computed from the join date and the Archive, and nothing else', () => {
    const body = lastFunctionBody('joined_in_year_zero');
    expect(body).toContain('year_zero_ends');
    expect(body).toContain('joined');
  });

  it.each([
    'is_eligible',
    'draw_order',
    'run_daily_draw',
    'refresh_selection_eligibility',
  ])('%s never mentions it', (fn) => {
    const body = lastFunctionBody(fn);
    // A renamed or deleted function would make the two checks below vacuous.
    expect(body).not.toBe('');
    expect(body).not.toContain('founding');
    expect(body).not.toContain('year_zero');
  });

  it('cannot be asked about somebody else', () => {
    // am_i_founding takes no argument; the raw helper is granted to nobody.
    expect(FLAT).toContain('am_i_founding()');
    expect(FLAT).toContain(
      'revoke execute on function public.joined_in_year_zero(timestamptz) from public, anon, authenticated'
    );
  });
});

/**
 * Retention thresholds are a pre-commitment, and a pre-commitment that lives in
 * two places is only as good as the check that they still agree.
 */
describe('the growth gate', () => {
  const gate = lastFunctionBody('growth_gate');

  it.each(Object.entries(GROWTH_GATE_THRESHOLDS))(
    '%s is %s in the database too',
    (check, threshold) => {
      // e.g. select 'd1_retention'::text, coalesce(d1, 0), 25.0::numeric
      const line = new RegExp(
        `'${check}'::text[^\\n]*?([0-9]+(?:\\.[0-9]+)?)::numeric`
      ).exec(gate)?.[1];

      expect(line).toBeDefined();
      expect(Number(line)).toBe(threshold);
    }
  );

  it('is moderator-only, checked inside the function', () => {
    // Not merely hidden behind a screen the client controls.
    expect(gate).toContain('is_moderator()');
    expect(gate).toContain('insufficient_privilege');
  });

  it('reports every one of the four checks', () => {
    for (const check of Object.keys(GROWTH_GATE_THRESHOLDS)) {
      expect(gate).toContain(`'${check}'`);
    }
  });
});

/**
 * The honesty rule that makes the numbers usable: a cohort that has not reached
 * day seven has not failed day seven.
 */
describe('cohort retention', () => {
  const cohorts = lastFunctionBody('retention_cohorts');

  it('reports null for immature cohorts rather than zero', () => {
    expect(cohorts).toMatch(/day_zero \+ 1 then null/);
    expect(cohorts).toMatch(/day_zero \+ 7 then null/);
  });

  it('is keyed on the install, not on a person', () => {
    expect(cohorts).toContain('install_id');
    expect(cohorts).not.toContain('email');
  });

  it('uses one explicit active event per UTC day', () => {
    expect(cohorts).toContain("a.event = 'active_day'");
    expect(cohorts).not.toContain("a.event = 'app_opened'");
  });

  it('is moderator-only', () => {
    expect(cohorts).toContain('is_moderator()');
  });
});
