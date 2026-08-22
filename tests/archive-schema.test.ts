import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');

/**
 * Comments and COMMENT ON strings are both stripped. A migration documenting
 * that ranking columns are forbidden must not trip the test that checks no
 * ranking exists — the prose describing a ban is not the ban being broken.
 */
const ALL_SQL = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .map((file) => readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/comment on [\s\S]*?;/gi, '')
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .toLowerCase();

const FLAT = ALL_SQL.replace(/\s+/g, ' ');

/**
 * The **last** definition, not the first.
 *
 * `create or replace` means a later migration supersedes an earlier one, so
 * matching the first occurrence would test SQL that Postgres no longer runs —
 * and a redefinition that broke Article 9.5 would pass unnoticed.
 */
function functionBody(name: string): string {
  const pattern = new RegExp(
    // Anchored on `create or replace`: a GRANT also contains
    // "function public.<name>(", and matching that would scan forward into
    // whatever body came next — in a different migration entirely.
    `create or replace function public\\.${name}\\([\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;`,
    'g'
  );

  let last = '';
  for (const match of ALL_SQL.matchAll(pattern)) {
    last = match[1] ?? '';
  }
  return last;
}

/**
 * Article 9.5 — the Archive may be browsed by Today, Yesterday, One year ago,
 * Random, Country and Year. Never by most liked, top human, viral or trending.
 *
 * These tests make that structural: the functions do not compute a popularity
 * figure, so there is nothing for a future ordering to sort by.
 */
describe('the Archive cannot be ranked', () => {
  const archive = functionBody('get_archive');

  it('exists and returns entries', () => {
    expect(archive).toContain('from public.daily_draws');
  });

  it('orders chronologically, newest first', () => {
    expect(archive).toContain('order by d.selection_date desc');
  });

  it('takes no ordering argument', () => {
    const signature =
      /function public\.get_archive\(([\s\S]*?)\)\s*returns/.exec(ALL_SQL)?.[1];

    expect(signature).toBeDefined();
    for (const forbidden of ['order', 'sort', 'rank']) {
      expect(signature).not.toContain(forbidden);
    }
  });

  it.each(['count(', 'remembers', 'question_votes', 'votes'])(
    'does not read %s',
    (forbidden) => {
      // Nothing to rank by, so no ordering by popularity can be added later
      // without also adding the data — which is the visible change.
      expect(archive).not.toContain(forbidden);
    }
  );

  it('has no function whose name suggests a ranking', () => {
    for (const forbidden of [
      'top_human',
      'most_liked',
      'trending',
      'popular',
      'leaderboard',
      'ranking',
    ]) {
      expect(ALL_SQL).not.toContain(forbidden);
    }
  });
});

describe('filters do not become leaderboards', () => {
  it('orders countries alphabetically, not by how many Humans they have', () => {
    // A country list sorted by count is a ranking of countries.
    expect(functionBody('get_archive_countries')).toContain(
      'order by pr.country_code asc'
    );
  });

  it('orders years chronologically', () => {
    expect(functionBody('get_archive_years')).toContain('order by 1 desc');
  });
});

describe('Random Human', () => {
  it('samples by offset rather than order by random()', () => {
    // `order by random()` stays banned everywhere so it can never quietly
    // reappear in the daily draw, where it would destroy auditability.
    expect(ALL_SQL).not.toMatch(/order\s+by\s+random\s*\(\s*\)/);
    expect(functionBody('get_random_human')).toContain(
      'floor(random() * total)'
    );
  });

  it('can be limited to one country', () => {
    expect(FLAT).toContain(
      'function public.get_random_human( filter_country char(2)'
    );
  });
});

describe('a removed Human keeps their place (Article 8.6)', () => {
  const archive = functionBody('get_archive');

  it('reports removal rather than leaving a screen to infer it', () => {
    expect(archive).toContain('(d.selected_user_id is null) as is_removed');
  });

  it('still lists them, by joining loosely', () => {
    // An inner join would make a removed Human vanish and the sequence gappy.
    expect(archive).toContain('left join public.profiles');
    expect(archive).toContain('left join public.portraits');
  });

  it('lists only cycles that were actually published', () => {
    expect(archive).toContain('d.human_number is not null');
    expect(archive).toContain("d.selection_status in ('live', 'completed')");
  });
});

describe('One Year Ago', () => {
  const anniversaries = functionBody('get_anniversaries');

  it('covers one, five, ten and twenty-five years', () => {
    expect(anniversaries).toContain('(values (1), (5), (10), (25))');
  });

  it('matches the same calendar day in UTC', () => {
    expect(anniversaries).toContain("(now() at time zone 'utc')::date");
  });
});

describe('the Archive is open to guests (Article 6.1)', () => {
  it.each([
    'public.get_archive(char(2), integer, integer, integer)',
    'public.get_human(uuid)',
    'public.get_random_human(char(2))',
    'public.get_anniversaries()',
    'public.get_archive_countries()',
    'public.get_archive_years()',
  ])('%s is granted to anon', (fn) => {
    expect(FLAT).toContain(`grant execute on function ${fn} to anon`);
  });
});
