import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');

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
 * The transparency numbers are the product's central claim made checkable
 * (Article 12). Two things have to stay true for them to be worth publishing.
 */
describe('selection transparency', () => {
  const stats = lastFunctionBody('selection_stats');

  it('exists and is readable by a guest', () => {
    expect(stats).not.toBe('');
    // A guest who cannot see how many are waiting cannot check "one in a
    // thousand", which is the whole point of publishing it.
    expect(FLAT).toContain(
      'grant execute on function public.selection_stats() to anon, authenticated'
    );
  });

  it('counts the pool the way the draw counts it', () => {
    // Not a hand-written copy of the eligibility predicate, which could drift
    // from the function that actually freezes the pool and leave us publishing
    // a confident wrong number.
    expect(stats).toContain('is_eligible');
  });
});

/**
 * A country with two people waiting is a country where being drawn identifies
 * you, and the Archive would confirm it the same day.
 */
describe('country representation has a floor', () => {
  const representation = lastFunctionBody('country_representation');
  const unnamed = lastFunctionBody('unnamed_countries');

  it('never names a country with fewer than five waiting', () => {
    expect(representation).not.toBe('');
    expect(representation).toMatch(/having count\(\*\) >= 5/);
  });

  it('still counts the ones it does not name, so the total reconciles', () => {
    expect(unnamed).not.toBe('');
    expect(unnamed).toMatch(/having count\(\*\) < 5/);
    expect(FLAT).toContain(
      'grant execute on function public.unnamed_countries() to anon, authenticated'
    );
  });

  it('is a database rule, not a client-side filter', () => {
    // The rows are never returned, so there is nothing for a caller to ask for.
    expect(representation).toContain('group by p.country_code');
  });
});

/**
 * "X people viewed you" is a view count, and a view count is a score with
 * better manners. docs/GROWTH.md forbids it; this is the structure behind it.
 */
describe('nothing counts an audience per person', () => {
  it('has no function returning views for a human', () => {
    expect(FLAT).not.toMatch(/function public\.\w*view_count/);
    expect(FLAT).not.toMatch(/function public\.\w*_views\b/);
    expect(FLAT).not.toMatch(/function public\.get_\w*viewers/);
  });

  it('does not expose how many people saw a given cycle', () => {
    // selection_stats reports the pool and the Archive. It must not grow a
    // column that attributes an audience to one person.
    const stats = lastFunctionBody('selection_stats');
    expect(stats).not.toContain('today_viewed');
    expect(stats).not.toContain('analytics_events');
  });
});

/**
 * A person's own words go to a translation vendor only after a moderator has
 * seen them, and only ever alongside the original (Article 9.6).
 */
describe('the translation queue', () => {
  const pending = lastFunctionBody('pending_translations');

  it('offers only approved, published portraits', () => {
    expect(pending).not.toBe('');
    expect(pending).toContain("p.status = 'approved'");
    expect(pending).toContain('d.human_number is not null');
  });

  it('is service role only', () => {
    expect(FLAT).toContain(
      'revoke execute on function public.pending_translations(integer) from public, anon, authenticated'
    );
    // And no grant puts it back.
    expect(FLAT).not.toMatch(
      /grant execute on function public\.pending_translations\(integer\) to/
    );
  });

  it('never lets a client translate somebody else’s words', () => {
    expect(FLAT).not.toMatch(
      /grant execute on function public\.record_translation\([^)]*\) to (anon|authenticated)/
    );
    expect(FLAT).not.toMatch(
      /grant execute on function public\.record_same_language\([^)]*\) to (anon|authenticated)/
    );
  });
});
