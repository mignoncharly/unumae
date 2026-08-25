import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), 'utf8');
const ci = read('.github', 'workflows', 'ci.yml');
const release = read('.github', 'workflows', 'release-candidate.yml');
const privilegeBaseline = read(
  'supabase',
  'migrations',
  '20260825110000_phase3_function_privilege_baseline.sql'
)
  .toLowerCase()
  .replace(/\s+/g, ' ');

describe('Phase 3 remote CI is an executable release gate', () => {
  it('rebuilds the full backend from empty and exercises every boundary', () => {
    for (const command of [
      'supabase start',
      'supabase db reset',
      'supabase db lint --local',
      'npm run verify:db-types',
      'supabase test db',
      'npm run test:edge',
      'npm run verify:draw',
      'npm run verify:privileges',
      'npm run verify:security',
      'npm run simulate',
      'npm run verify:edge',
      'supabase stop --no-backup',
    ]) {
      expect(ci).toContain(command);
    }
  });

  it('runs application, website, audits, doctor, and secret scanning', () => {
    expect(ci).toContain('npm run verify');
    expect(ci).toContain('npx expo-doctor');
    expect(ci).toContain('working-directory: website');
    expect(ci).toContain('npm run scan:secrets');
    expect(ci.match(/npm audit --audit-level=high/g)).toHaveLength(2);
  });

  it('pins third-party actions to immutable commit SHAs', () => {
    const actionReferences = [ci, release].flatMap((workflow) =>
      [...workflow.matchAll(/uses:\s+([^\s#]+)/g)].map(
        ([, reference]) => reference
      )
    );
    expect(actionReferences.length).toBeGreaterThan(0);
    for (const reference of actionReferences) {
      expect(reference).toMatch(/@[0-9a-f]{40}$/);
    }
  });

  it('tears down the disposable backend even on failure', () => {
    expect(ci).toMatch(/name: Stop isolated stack[\s\S]*if: always\(\)/);
  });

  it('releases only an exact SHA with successful CI provenance', () => {
    expect(release).toContain('ref: ${{ inputs.commit_sha }}');
    expect(release).toContain('RELEASE_SHA: ${{ inputs.commit_sha }}');
    expect(release).toContain('node scripts/verify-ci-provenance.mjs');
    expect(release).toContain('.eas/workflows/e2e-ios.yml');
  });
});

describe('Phase 3 PostgreSQL privilege baseline', () => {
  it('removes implicit PUBLIC execution now and for future functions', () => {
    expect(privilegeBaseline).toContain(
      'revoke execute on all functions in schema public from public'
    );
    expect(privilegeBaseline).toContain(
      'alter default privileges in schema public revoke execute on functions from public'
    );
  });
});
