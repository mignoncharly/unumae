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

function functionBody(name: string): string {
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

/**
 * Without one moderator, no portrait can be approved, so no cycle can go live
 * and every day is a Quiet Day. The bootstrap is therefore load-bearing, and
 * these tests keep it from being quietly weakened.
 */
describe('the first moderator', () => {
  it('removes immutable personal-address bootstrap data in Phase 10', () => {
    expect(FLAT).toContain('truncate table public.founding_moderators');
  });

  it('is promoted automatically when their profile is created', () => {
    expect(FLAT).toContain(
      'create trigger profiles_promote_founding_moderator after insert on public.profiles'
    );
  });

  it('is promoted after the profile exists, not before', () => {
    // moderators references profiles, so a BEFORE trigger would fail the
    // foreign key on the very first user.
    expect(FLAT).toContain('after insert on public.profiles');
    expect(FLAT).not.toContain(
      'before insert on public.profiles for each row execute function public.promote_founding_moderator'
    );
  });

  it('backfills anybody who already had a profile', () => {
    expect(FLAT).toContain(
      'insert into public.moderators (user_id, note) select p.id'
    );
  });

  it('matches on the account email, not on anything guessable', () => {
    expect(functionBody('promote_founding_moderator')).toContain(
      'from auth.users u'
    );
  });
});

describe('moderation authority cannot spread by itself', () => {
  it('gives no client a write on the moderators table', () => {
    expect(FLAT).toContain(
      'revoke all on public.moderators from anon, authenticated'
    );
    expect(FLAT).not.toMatch(
      /grant (insert|update|delete|all)[a-z, ()]*on public\.moderators to/
    );
  });

  it('keeps grant and revoke to the service role', () => {
    for (const fn of ['grant_moderator(text)', 'revoke_moderator(text)']) {
      expect(FLAT).toContain(
        `revoke execute on function public.${fn} from public, anon, authenticated`
      );
    }
    // Never granted back to anybody.
    expect(FLAT).not.toMatch(
      /grant execute on function public\.(grant|revoke)_moderator\(text\) to/
    );
  });

  it('never lets a moderator appoint another moderator', () => {
    // is_moderator() appears in every moderator action, and deliberately not
    // in these two: being a moderator is not authority to create one.
    expect(functionBody('grant_moderator')).not.toContain('is_moderator');
    expect(functionBody('revoke_moderator')).not.toContain('is_moderator');
  });

  it('keeps the seed list closed to clients', () => {
    expect(FLAT).toContain(
      'revoke all on public.founding_moderators from anon, authenticated'
    );
  });
});

describe('removing a seed does not demote anyone', () => {
  it('keeps the two tables independent', () => {
    // An accidental delete from founding_moderators must not silently strip
    // somebody's access mid-shift.
    const promote = functionBody('promote_founding_moderator');
    expect(promote).not.toContain('delete from public.moderators');
    expect(ALL_SQL).not.toMatch(
      /on delete cascade[\s\S]{0,80}founding_moderators/
    );
  });
});
