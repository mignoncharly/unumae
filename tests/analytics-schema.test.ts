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
    const created = enumBody.match(/'[a-z_]+'/g) ?? [];
    const added = [
      ...ALL_SQL.matchAll(
        /alter type public\.analytics_event add value if not exists ('[a-z_]+')/g
      ),
    ].map((match) => match[1]);
    const values = [...new Set([...created, ...added])];
    expect(values).toHaveLength(25);
    expect(values).toEqual(
      expect.arrayContaining([
        "'active_day'",
        "'portrait_started'",
        "'portrait_submitted'",
        "'question_unvoted'",
        "'human_forgotten'",
        "'remembered_library_opened'",
        "'share_sheet_opened'",
        "'selection_explainer_opened'",
        "'mission_opened'",
      ])
    );
  });

  it('drops a bounded minority of event names it does not recognise', () => {
    expect(functionBodyOf('ingest_analytics_events')).toContain(
      'analytics invalid-event ratio exceeded'
    );
    expect(functionBodyOf('ingest_analytics_events')).toContain(
      "value ->> 'event' = any ("
    );
  });

  it('deduplicates an active installation within each UTC day', () => {
    expect(FLAT).toContain(
      "create unique index idx_analytics_active_day_once on public.analytics_events (install_id, occurred_on) where event = 'active_day'"
    );
    expect(functionBodyOf('ingest_analytics_events')).toContain(
      'on conflict do nothing'
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

  it('allows writes only through the service-backed Edge boundary', () => {
    expect(FLAT).toContain(
      'grant execute on function public.ingest_analytics_events( bytea, bytea, jsonb, boolean ) to service_role'
    );
    expect(FLAT).toContain(
      'revoke execute on function public.track_events(uuid, jsonb) from public, anon, authenticated, service_role'
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

  it('uses the corrected positive-action and share-sheet semantics', () => {
    expect(kpis).toContain("event = 'share_sheet_opened'");
    expect(kpis).toContain("event = 'human_remembered'");
    expect(kpis).not.toContain("event = 'share_completed'");
  });
});

describe('journey measurement is operational', () => {
  it('stores the invitation open once on the invitation itself', () => {
    expect(FLAT).toContain('add column opened_at timestamptz');
    expect(functionBodyOf('mark_invitation_opened')).toContain(
      'opened_at = coalesce(i.opened_at, now())'
    );
  });

  it.each(['invitation', 'portrait', 'question', 'memory'])(
    'reports the %s funnel',
    (journey) => {
      expect(functionBodyOf('analytics_journey_funnels')).toContain(
        `'${journey}'`
      );
    }
  );

  it('keeps funnel and notification attribution moderator-only', () => {
    expect(functionBodyOf('analytics_journey_funnels')).toContain(
      'if not public.is_moderator() then'
    );
    expect(functionBodyOf('analytics_notification_attribution')).toContain(
      'if not public.is_moderator() then'
    );
  });
});
