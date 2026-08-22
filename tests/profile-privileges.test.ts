import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Row level security decides which rows you touch; column GRANTs decide which
 * columns. Article 5.1 makes eligibility binary and not self-assigned, so the
 * columns that decide it must never be writable by the `authenticated` role.
 *
 * This reads the migration rather than the database, so it fails in `npm run
 * verify` before a bad migration is ever applied.
 */
const MIGRATION = readFileSync(
  join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20260822010000_profiles.sql'
  ),
  'utf8'
)
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .toLowerCase();

/** Everything between `grant <kind> (` and the matching `)`. */
function grantedColumns(kind: 'insert' | 'update'): string[] {
  const match = new RegExp(`grant ${kind}\\s*\\(([^)]*)\\)`, 's').exec(
    MIGRATION
  );
  if (!match) {
    return [];
  }
  return match[1]!
    .split(',')
    .map((column) => column.trim())
    .filter(Boolean);
}

const PRIVILEGED = [
  'selection_eligible',
  'verification_level',
  'account_status',
  'accepted_rules_at',
];

describe('profiles column privileges', () => {
  it('revokes everything before granting anything', () => {
    expect(MIGRATION).toContain('revoke all on public.profiles');
  });

  it.each(PRIVILEGED)('never lets a user insert %s', (column) => {
    expect(grantedColumns('insert')).not.toContain(column);
  });

  it.each(PRIVILEGED)('never lets a user update %s', (column) => {
    expect(grantedColumns('update')).not.toContain(column);
  });

  it('never lets a user update their birth year', () => {
    // An age gate you can edit afterwards is not a gate (Article 8.4).
    expect(grantedColumns('insert')).toContain('birth_year');
    expect(grantedColumns('update')).not.toContain('birth_year');
  });

  it('enforces the minimum age with a trigger, not a comment', () => {
    expect(MIGRATION).toContain('profiles_enforce_min_age');
    expect(MIGRATION).toContain('extract(year from now())::integer - 16');
  });

  it('scopes every policy to the owner', () => {
    const policies = MIGRATION.match(/create policy[\s\S]*?;/g) ?? [];
    expect(policies.length).toBeGreaterThan(0);

    for (const policy of policies) {
      expect(policy).toContain('auth.uid()');
      expect(policy).toContain('to authenticated');
    }
  });

  it('grants nothing at all to anonymous users', () => {
    expect(MIGRATION).not.toMatch(/grant[^;]*\bto\b[^;]*\banon\b/);
  });
});
