import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');

const ALL_SQL = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .map((file) => readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
  .join('\n')
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .toLowerCase();

// Line breaks are formatting: a revoke split across two lines is the same
// revoke. Statement-level assertions use this rather than the raw text.
const FLAT = ALL_SQL.replace(/\s+/g, ' ');

describe('the acceptance window (Article 5.5)', () => {
  it('is twelve hours, set by the database and not by a client', () => {
    expect(ALL_SQL).toContain("now() + interval '12 hours'");
  });

  it('cannot be accepted after it closes', () => {
    // Otherwise a late acceptance could produce two humans for one cycle,
    // which is the one thing Article 1.6 forbids outright.
    expect(ALL_SQL).toContain('invitation.acceptance_deadline < now()');
  });

  it('keeps silence distinct from refusal', () => {
    // 'expired' and 'declined' are different answers about a person, and only
    // one of them was a decision.
    expect(ALL_SQL).toContain("'expired'");
    expect(ALL_SQL).toContain("'declined'");
  });

  it('records who was asked, so escalation cannot erase the history', () => {
    expect(ALL_SQL).toContain('create table public.draw_invitations');
    expect(ALL_SQL).toContain(
      'constraint draw_invitations_unique_person unique (draw_id, user_id)'
    );
  });
});

describe('declining carries no penalty (Article 5.6)', () => {
  const decline =
    /function public\.decline_selection[\s\S]*?as \$\$([\s\S]*?)\$\$;/.exec(
      ALL_SQL
    )?.[1];

  it('exists', () => {
    expect(decline).toBeDefined();
  });

  it.each([
    'selection_eligible',
    'wants_selection',
    'account_status',
    'penalt',
    'strike',
    'ban',
  ])('never touches %s', (forbidden) => {
    expect(decline).not.toContain(forbidden);
  });

  it('asks the next backup immediately rather than waiting out the clock', () => {
    expect(decline).toContain('public.escalate_draw');
    expect(decline).toContain('public.notify_selected_candidate');
  });
});

describe('expiry carries no penalty either (Article 5.5)', () => {
  const expire =
    /function public\.expire_stale_invitations[\s\S]*?as \$\$([\s\S]*?)\$\$;/.exec(
      ALL_SQL
    )?.[1];

  it.each(['selection_eligible', 'wants_selection', 'account_status'])(
    'never touches %s',
    (forbidden) => {
      expect(expire).not.toContain(forbidden);
    }
  );
});

describe('a candidate can only answer for themselves', () => {
  it.each(['accept_selection', 'decline_selection', 'my_pending_invitation'])(
    '%s scopes to auth.uid() and takes no user argument',
    (fn) => {
      const body = new RegExp(
        `function public\\.${fn}\\(([^)]*)\\)[\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;`
      ).exec(ALL_SQL);

      expect(body).not.toBeNull();
      // No arguments: it cannot be aimed at anybody else.
      expect(body![1]!.trim()).toBe('');
      expect(body![2]).toContain('auth.uid()');
    }
  );
});

describe('the cycle is driven by the scheduler, never by a client', () => {
  it('revokes execute from anon on every privileged function', () => {
    // Postgres grants EXECUTE to PUBLIC by default and Supabase grants it to
    // anon as well, so each of these needs saying out loud.
    for (const fn of [
      'public.run_daily_draw(date)',
      'public.escalate_draw(date)',
      'public.notify_selected_candidate(date)',
      'public.expire_stale_invitations()',
    ]) {
      expect(FLAT).toContain(`revoke execute on function ${fn} from anon`);
    }
  });

  it('changes the default so the next function is closed, not open', () => {
    expect(FLAT).toContain(
      'alter default privileges in schema public revoke execute on functions from anon'
    );
  });

  it('schedules the draw at D-2 and the expiry sweep in between', () => {
    expect(ALL_SQL).toContain("'onehuman-daily-draw'");
    expect(ALL_SQL).toContain("'onehuman-expire-invitations'");
    expect(ALL_SQL).toContain("'0 0 * * *'");
  });
});
