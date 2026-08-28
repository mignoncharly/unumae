import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

/**
 * Three things a real user could hit that no earlier phase covered.
 *
 * Each was invisible rather than broken: nothing failed, nothing was logged,
 * and the tests passed. That is the class of defect this file exists for.
 */

describe('a person can reach a human', () => {
  const site = read('website', 'src', 'content', 'site.ts');
  const legal = read('website', 'src', 'content', 'legal.ts');
  const footer = read('website', 'src', 'components', 'SiteFooter.astro');

  it('publishes one contact address, defined once', () => {
    expect(site).toContain("export const CONTACT_EMAIL = 'hello@unumae.app'");
    // Defined once and interpolated, so the policy text and the footer cannot
    // drift apart.
    expect(legal).toContain('${CONTACT_EMAIL}');
    expect(legal).not.toMatch(/hello@unumae\.app/);
  });

  it('puts it on every page, not only in the policy that promises it', () => {
    expect(footer).toContain('CONTACT_EMAIL');
    expect(footer).toContain('mailto:');
  });

  it('does not promise an answer without saying where to write', () => {
    // The privacy policy said "write to us" for eleven phases with no address
    // anywhere on the site. GDPR Article 13 wants the controller's contact
    // details given, and Apple wants a support URL that leads somewhere.
    for (const promise of [
      'Write to us at',
      'Écrivez-nous à',
      'Schreib uns an',
    ]) {
      expect(legal).toContain(promise);
    }
  });
});

describe('an appeal can always be heard, or is escalated', () => {
  const migration = read(
    'supabase',
    'migrations',
    '20260828120000_phase12_appeal_reviewability.sql'
  );
  const appeals = read(
    'supabase',
    'migrations',
    '20260823190000_moderation_actions_and_appeals.sql'
  );

  it('keeps the separate-reviewer rule rather than weakening it', () => {
    expect(appeals).toContain('Appeals require a different moderator');
    expect(migration).not.toContain('drop function');
    // Named in the header comment for context, but never redefined: the rule
    // is the control, and the fix is to surface what it blocks.
    expect(migration).not.toContain(
      'create or replace function public.review_moderation_appeal'
    );
  });

  it('raises a critical alert when no moderator may review an appeal', () => {
    expect(migration).toContain("'appeal_unreviewable'");
    expect(migration).toContain("'critical'");
    // A single-moderator roster makes every appeal against that moderator's own
    // decision permanently undecidable, and it never surfaced anywhere.
    expect(migration).toContain('public.moderators m');
  });

  it('resolves the alert once a second moderator exists', () => {
    expect(migration).toContain('resolved_at = now()');
  });

  it('lets an operator see the condition before anyone is stuck in it', () => {
    expect(migration).toContain('function public.appeal_review_capacity()');
    expect(migration).toContain('moderator_count');
    expect(migration).toContain('unreviewable_appeals');
  });

  it('is reachable only by a moderator', () => {
    expect(migration).toContain('if not public.is_moderator()');
    expect(migration).toContain(
      'revoke execute on function public.appeal_review_capacity() from public, anon'
    );
  });

  it('pins search_path on every function it defines', () => {
    const definitions = migration.match(/create or replace function/g) ?? [];
    const pinned = migration.match(/set search_path = ''/g) ?? [];
    expect(definitions.length).toBeGreaterThan(0);
    expect(pinned.length).toBeGreaterThanOrEqual(definitions.length);
  });
});

describe('the session lives in the keychain', () => {
  const client = read('src', 'lib', 'supabase', 'client.ts');
  const storage = read('src', 'lib', 'supabase', 'secureStorage.ts');

  it('no longer hands Supabase AsyncStorage for the tokens', () => {
    expect(client).toContain('storage: secureSessionStorage');
    expect(client).not.toContain('storage: AsyncStorage');
  });

  it('survives a value larger than one Android keystore item', () => {
    expect(storage).toContain('chunkByBytes');
    // Splitting on a byte index would cut a character in half.
    expect(storage).toContain('for (const character of value)');
  });

  it('moves an existing signed-in session instead of dropping it', () => {
    expect(storage).toContain('AsyncStorage.getItem(key)');
    expect(storage).toContain('AsyncStorage.removeItem(key)');
  });
});
