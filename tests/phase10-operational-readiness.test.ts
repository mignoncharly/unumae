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
    const storageVerifier = read('scripts', 'verify-storage-backup.mjs');
    const databaseVerifier = read('scripts', 'verify-restored-database.sql');
    expect(backup).toContain('pg_dump');
    expect(backup).toContain('export-storage-backup.mjs');
    expect(backup).toContain('age --recipient');
    expect(backup).toContain('retention-days: 35');
    expect(backup).toContain('actions/upload-artifact');
    expect(backup).not.toContain('aws s3');
    expect(restore).toContain('pg_restore');
    expect(restore).toContain('actions/download-artifact');
    expect(restore).toContain('RESTORE_DATABASE_URL');
    expect(restore).not.toContain('supabase start');
    expect(restore).not.toContain('supabase stop');
    expect(restore).toContain('verify-storage-backup.mjs');
    expect(restore).toContain('verify-restored-database.sql');
    expect(restore).toContain('backup_generation must be a UTC timestamp');
    expect(storageVerifier).toContain('checksum mismatch');
    expect(databaseVerifier).toContain('orphaned draw-candidate rows');
    expect(databaseVerifier).toContain('Approved media must retain');
    expect(databaseVerifier).toContain('claim_account_deletion_requests');
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
