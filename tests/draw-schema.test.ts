import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Static guards on the selection engine.
 *
 * These read the migrations rather than the database, so a change that would
 * break Article 5 fails `npm run verify` before it is ever applied.
 */
const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');

const ALL_SQL = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .map((file) => readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
  .join('\n')
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .toLowerCase();

describe('the draw cannot be rigged by construction', () => {
  it('never selects with order by random()', () => {
    // Article 5.2 forbids it as a selection mechanism: it leaves no record
    // that anyone could check afterwards.
    expect(ALL_SQL).not.toMatch(/order\s+by\s+random\s*\(\s*\)/);
  });

  it('seeds from a cryptographically secure source', () => {
    expect(ALL_SQL).toContain('gen_random_bytes(32)');
    // random() is not a CSPRNG and is seeded predictably per session.
    expect(ALL_SQL).not.toMatch(/:=\s*random\s*\(\s*\)/);
  });

  it('records the pool hash and the seed on every draw', () => {
    expect(ALL_SQL).toContain('candidate_pool_hash text not null');
    expect(ALL_SQL).toContain('random_seed text not null');
  });

  it('orders candidates by an HMAC of the seed, not by anything about them', () => {
    expect(ALL_SQL).toContain("hmac(candidate::text, seed, 'sha256')");
  });

  it('keeps the verification functions callable by anyone', () => {
    // A fairness claim nobody can check is just a claim (Article 12).
    for (const grant of [
      'grant execute on function public.draw_rank(text, uuid) to anon',
      'grant execute on function public.draw_order(text, uuid[]) to anon',
      'grant execute on function public.pool_hash(uuid[]) to anon',
    ]) {
      expect(ALL_SQL).toContain(grant);
    }
  });

  it('never lets a client run the draw itself', () => {
    expect(ALL_SQL).toContain(
      'revoke execute on function public.run_daily_draw(date) from anon, authenticated'
    );
    expect(ALL_SQL).toContain(
      'revoke execute on function public.escalate_draw(date) from anon, authenticated'
    );
  });
});

describe('eligibility takes no forbidden input (Article 5.3)', () => {
  // The body between the dollar quotes, not the signature: a non-greedy match
  // on `$$` alone stops at the opening delimiter and captures nothing useful.
  const isEligible =
    /function public\.is_eligible[\s\S]*?as \$\$([\s\S]*?)\$\$;/.exec(
      ALL_SQL
    )?.[1];

  it('exists', () => {
    expect(isEligible).toBeDefined();
    expect(isEligible).toContain('account_status');
  });

  it.each([
    'payment',
    'subscription',
    'engagement',
    'session_count',
    'quality',
    'sponsor',
    'priority',
    'weight',
    'score',
  ])('does not consider %s', (forbidden) => {
    expect(isEligible).not.toContain(forbidden);
  });

  it('excludes anyone already selected, with no cooldown to tune', () => {
    expect(isEligible).toContain('d.selected_user_id = p.id');
    expect(isEligible).not.toMatch(/interval\s*'/);
  });
});

describe('the audit trail survives deletion (Article 8.6)', () => {
  it('nulls the identity on a draw rather than deleting the row', () => {
    // This is the tombstone: number, date, pool hash and seed survive so the
    // record stays verifiable; the person does not.
    const draws = /create table public\.daily_draws[\s\S]*?\);/.exec(
      ALL_SQL
    )?.[0];

    expect(draws).toContain(
      'selected_user_id uuid references public.profiles (id) on delete set null'
    );
    expect(draws).not.toMatch(/selected_user_id[^,]*on delete cascade/);
  });

  it('removes pool membership entirely, because it is private', () => {
    const candidates = /create table public\.draw_candidates[\s\S]*?\);/.exec(
      ALL_SQL
    )?.[0];

    expect(candidates).toContain(
      'user_id uuid not null references public.profiles (id) on delete cascade'
    );
  });
});

describe('one human per cycle (Article 1.6)', () => {
  it('is enforced by a unique index, not by a code path', () => {
    expect(ALL_SQL).toContain(
      'create unique index idx_daily_draws_active_cycle'
    );
    expect(ALL_SQL).toContain("where selection_status <> 'cancelled'");
  });
});

describe('a pending draw is not readable (Article 5.2)', () => {
  it('exposes only live and completed cycles', () => {
    // Otherwise anyone could recompute the ordering and learn tomorrow's human.
    expect(ALL_SQL).toContain(
      "using (selection_status in ('live', 'completed'))"
    );
  });

  it('never grants the identity columns to a client', () => {
    const grant = /grant select \(([\s\S]*?)\) on public\.daily_draws/.exec(
      ALL_SQL
    )?.[1];

    expect(grant).toBeDefined();
    for (const column of [
      'selected_user_id',
      'backup_1',
      'backup_2',
      'backup_3',
    ]) {
      expect(grant).not.toContain(column);
    }
  });
});
