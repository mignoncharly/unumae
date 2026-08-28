import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('Phase 10 operational readiness', () => {
  it('keeps ordinary CI local and hosted deployment exact-SHA only', () => {
    const ci = read('.github', 'workflows', 'ci.yml');
    const promote = read('.github', 'workflows', 'promote.yml');
    const health = read('.github', 'workflows', 'hosted-health.yml');
    expect(ci).toContain('supabase start');
    expect(ci).not.toContain('SUPABASE_ACCESS_TOKEN');
    expect(promote).toContain('verify-ci-provenance.mjs');
    expect(promote).toContain('verify-promotion-target.mjs');
    expect(promote).toContain('environment: production');
    expect(promote).not.toContain('inputs.target');
    expect(promote).toContain('Capture sanitized pre-deployment baseline');
    expect(promote).toContain('SUPABASE_DB_POOLER_URL');
    expect(promote).toContain('Capture sanitized post-deployment baseline');
    expect(health).toContain('SUPABASE_ANON_KEY');
  });

  it('backs up database and photos encrypted outside Supabase and rehearses restore', () => {
    const backup = read('.github', 'workflows', 'production-backup.yml');
    const restore = read('.github', 'workflows', 'restore-rehearsal.yml');
    expect(backup).toContain('pg_dump');
    expect(backup).toContain('export-storage-backup.mjs');
    expect(backup).toContain('age --recipient');
    expect(backup).toContain('BACKUP_RETENTION_DAYS');
    expect(restore).toContain('pg_restore');
    expect(restore).toContain('Elapsed:');
  });

  it('stores scheduler credentials in Vault rather than a public table', () => {
    const migration = read(
      'supabase',
      'migrations',
      '20260826120000_phase10_operational_readiness.sql'
    );
    expect(migration).toContain('vault.decrypted_secrets');
    expect(migration).toContain('drop table if exists public.job_secrets');
    expect(migration).toContain('configure_job_secret');
  });

  it('keeps Phase C baseline comparison and hosted fixtures shell-safe', () => {
    const phaseC = read('.github', 'workflows', 'hosted-phase-c.yml');
    const compare = read('scripts', 'compare-hosted-baselines.mjs');
    const edge = read('scripts', 'verify-edge-functions.mjs');
    const deletion = read('scripts', 'verify-delete-account.mjs');
    const simulation = read('scripts', 'simulate-cycle.mjs');
    expect(phaseC).toContain('node scripts/compare-hosted-baselines.mjs');
    expect(phaseC).not.toContain("node - <<'NODE'");
    expect(compare).toContain('captured_at_utc');
    expect(edge).toContain(
      'token: publicFunctions.includes(name) ? undefined : secretKey'
    );
    expect(deletion).toContain('body: { jobRunId }');
    expect(simulation).toContain(
      'draw_version: (existingRows[0]?.draw_version ?? 0) + 1'
    );
  });
});
