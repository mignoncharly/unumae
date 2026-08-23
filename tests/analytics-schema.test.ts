import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');

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

function tableBody(name: string): string {
  return (
    new RegExp(`create table public\\.${name}[\\s\\S]*?\\n\\);`).exec(
      ALL_SQL
    )?.[0] ?? ''
  );
}

/**
 * The plan asks for real analytics. What it must not become is surveillance,
 * and the difference is not a matter of intent — it is a matter of which
 * columns exist.
 */
describe('analytics cannot become tracking', () => {
  const events = tableBody('analytics_events');

  it('has a table at all', () => {
    expect(events).toContain('install_id uuid not null');
  });

  it.each([
    'ip_address',
    'ip ',
    'user_agent',
    'device_model',
    'device_id',
    'idfa',
    'advertising',
    'latitude',
    'longitude',
    'location',
    'referrer',
  ])('has no %s column', (column) => {
    // Not blank — absent. There is nowhere to put it.
    expect(events).not.toContain(column);
  });

  it('records only the events named in the enum', () => {
    // "What do you collect?" has an exact answer.
    expect(FLAT).toContain('create type public.analytics_event as enum');
    const enumBody =
      /create type public\.analytics_event as enum \(([\s\S]*?)\);/.exec(
        ALL_SQL
      )?.[1] ?? '';
    const values = enumBody.match(/'[a-z_]+'/g) ?? [];
    expect(values.length).toBe(16);
  });

  it('drops an event name it does not recognise rather than raising', () => {
    // A client from an older release must not fail because a name changed.
    expect(functionBodyOf('track_events')).toContain(
      "where item ->> 'event' = any ("
    );
  });

  it('caps the size of properties', () => {
    expect(FLAT).toContain('check (pg_column_size(properties) <= 2048)');
  });
});

function functionBodyOf(name: string): string {
  const pattern = new RegExp(
    `create or replace function public\\.${name}\\([\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;`,
    'g'
  );
  let last = '';
  for (const match of ALL_SQL.matchAll(pattern)) {
    last = match[1] ?? '';
  }
  return last;
}

describe('nobody can read what was collected', () => {
  it('gives no client any access to the table', () => {
    expect(FLAT).toContain(
      'revoke all on public.analytics_events from anon, authenticated'
    );
  });

  it('has no select policy at all', () => {
    expect(ALL_SQL).not.toMatch(/policy[^;]*on public\.analytics_events/);
  });

  it('lets a guest write, because a guest is most of the audience', () => {
    expect(FLAT).toContain(
      'grant execute on function public.track_events(uuid, jsonb) to anon, authenticated'
    );
  });

  it('shows the numbers only to a moderator', () => {
    expect(functionBodyOf('analytics_kpis_guarded')).toContain(
      'if not public.is_moderator() then'
    );
    expect(FLAT).toContain(
      'revoke execute on function public.analytics_kpis(integer) from authenticated'
    );
  });
});

describe('retention is enforced, not promised', () => {
  it('deletes anything older than 90 days', () => {
    expect(functionBodyOf('purge_old_analytics')).toContain('::date - 90');
  });

  it('is scheduled, so it actually runs', () => {
    expect(ALL_SQL).toContain("'unumae-purge-analytics'");
  });
});

describe('the KPIs are the ones the plan asked for', () => {
  const kpis = functionBodyOf('analytics_kpis');

  it.each(['activation', 'curiosity', 'engagement', 'memory', 'sharing'])(
    'reports %s',
    (metric) => {
      expect(kpis).toContain(`'${metric}'`);
    }
  );

  it('does not report DAU or MAU', () => {
    // The plan is explicit that those are not the point.
    expect(kpis).not.toContain('dau');
    expect(kpis).not.toContain('mau');
  });
});
