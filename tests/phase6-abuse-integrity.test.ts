import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const migration = readFileSync(
  join(
    root,
    'supabase',
    'migrations',
    '20260825140000_phase6_abuse_data_integrity.sql'
  ),
  'utf8'
).toLowerCase();
const analytics = readFileSync(
  join(root, 'src', 'lib', 'analytics', 'provider.ts'),
  'utf8'
);
const reportApi = readFileSync(
  join(root, 'src', 'features', 'moderation', 'api.ts'),
  'utf8'
);
const reportEdge = readFileSync(
  join(root, 'supabase', 'functions', 'report-content', 'index.ts'),
  'utf8'
);
const analyticsEdge = readFileSync(
  join(root, 'supabase', 'functions', 'analytics-ingest', 'index.ts'),
  'utf8'
);

describe('Phase 6 abuse and data-integrity boundary', () => {
  it('removes client-generated analytics identities and direct RPC writes', () => {
    expect(analytics).not.toContain('randomUUID');
    expect(analytics).not.toContain("rpc('track_events'");
    expect(analytics).toContain("functions.invoke('analytics-ingest'");
    expect(migration).toContain(
      'revoke execute on function public.track_events(uuid, jsonb)'
    );
  });

  it('requires attested sessions and layered rate limits', () => {
    expect(migration).toContain('create table public.installation_sessions');
    expect(migration).toContain('analytics-installation-day');
    expect(reportEdge).toContain('report-network-hour');
    expect(analyticsEdge).toContain(
      "request.headers.get('X-Installation-Session')"
    );
    expect(reportApi).toContain("functions.invoke('report-content'");
  });

  it('bounds queues and operational retention', () => {
    expect(migration).toContain(
      'idx_content_reports_one_open_per_reporter_target'
    );
    expect(migration).toContain('active_tokens >= 3');
    expect(migration).toContain("attempted_at < now() - interval '90 days'");
    expect(migration).toContain("status = 'dismissed'");
  });
});
