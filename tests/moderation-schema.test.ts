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
 * Moderation is a power exercised over people. These tests are about keeping
 * that power accountable and narrow, not about catching bad content.
 */
describe('only moderators can moderate', () => {
  it.each([
    'review_portrait',
    'review_question',
    'resolve_report',
    'set_account_status',
  ])('%s refuses inside the database', (fn) => {
    // The client decides what to show. It never decides who may act — being
    // wrong about the first leaks a button, being wrong about the second
    // leaks a capability.
    expect(functionBody(fn)).toContain('if not public.is_moderator() then');
  });

  it.each([
    'moderation_portrait_queue',
    'moderation_question_queue',
    'moderation_report_queue',
  ])('%s returns nothing to anyone else', (fn) => {
    expect(functionBody(fn)).toContain('public.is_moderator()');
  });

  it('never lets a client write the moderators table', () => {
    expect(FLAT).toContain(
      'revoke all on public.moderators from anon, authenticated'
    );
    expect(FLAT).not.toMatch(/grant [a-z, ()]*on public\.moderators to/);
  });
});

describe('every decision leaves a trace', () => {
  it.each([
    'review_portrait',
    'review_question',
    'resolve_report',
    'set_account_status',
  ])('%s writes a moderation_events row', (fn) => {
    expect(functionBody(fn)).toContain('insert into public.moderation_events');
  });

  it('never updates or deletes the log', () => {
    // Append-only, like daily_draws. A decision nobody can review afterwards
    // is a decision nobody can be held to.
    expect(ALL_SQL).not.toMatch(/update public\.moderation_events/);
    expect(ALL_SQL).not.toMatch(/delete from public\.moderation_events/);
  });

  it('gives no client any write on the log', () => {
    expect(FLAT).toContain(
      'revoke all on public.moderation_events from anon, authenticated'
    );
    expect(FLAT).not.toMatch(
      /grant (insert|update|delete)[a-z, ()]*on public\.moderation_events to/
    );
  });
});

describe('automated screening flags, it does not judge', () => {
  const screen = functionBody('screen_text');

  it('looks at structure, not vocabulary', () => {
    for (const signal of [
      'contains_link',
      'all_caps',
      'repeated_characters',
      'mentions_handle',
    ]) {
      expect(screen).toContain(signal);
    }
  });

  it('is not a word list', () => {
    // A list of forbidden words in a repository ages badly and misfires on the
    // people it is meant to protect. Semantic screening belongs to a service
    // that can be corrected without a deployment.
    expect(screen).not.toMatch(/\bin\s*\(\s*'/);
    expect(screen).not.toContain('any(array[');
  });

  it('never rejects anything by itself', () => {
    const flagger = functionBody('flag_question_on_insert');
    expect(flagger).toContain("'auto_flagged'");
    expect(flagger).not.toContain("'rejected'");
    expect(flagger).not.toContain('raise exception');
  });
});

describe('blocking is personal, not editorial', () => {
  it('hides a blocked person from the blocker only', () => {
    const questions = functionBody('get_questions');
    expect(questions).toContain('from public.user_blocks b');
    expect(questions).toContain('b.blocker_id = (select auth.uid())');
  });

  it('does not change the blocked content itself', () => {
    // One person must not be able to remove another's words from the world by
    // pressing a button.
    const block = functionBody('block_user');
    expect(block).not.toContain('update public.questions');
    expect(block).not.toContain('public.moderation_decisions');
  });

  it('refuses a self-block at both levels', () => {
    expect(FLAT).toContain(
      'constraint user_blocks_not_self check (blocker_id <> blocked_id)'
    );
    expect(functionBody('block_user')).toContain(
      'if target_user = (select auth.uid()) then'
    );
  });
});

describe('reporting stays available but not floodable', () => {
  it('rate limits reports per hour', () => {
    expect(functionBody('report_content')).toContain('if recent >= 20 then');
  });

  it('keeps the report when the reporter deletes their account', () => {
    // The report becomes an event without an author, rather than vanishing and
    // taking the moderation history with it.
    expect(FLAT).toContain(
      'reporter_id uuid references public.profiles (id) on delete set null'
    );
  });
});

describe('data export is the data, not a summary (Article 8.2)', () => {
  const exportData = functionBody('export_my_data');

  it('returns the rows themselves', () => {
    for (const section of [
      'profile',
      'questions_authored',
      'humans_i_remember',
      'invitations',
      'blocked_people',
    ]) {
      expect(exportData).toContain(`'${section}'`);
    }
  });

  it('is scoped to the caller everywhere', () => {
    const scopes = exportData.match(/\(select auth\.uid\(\)\)/g) ?? [];
    expect(scopes.length).toBeGreaterThanOrEqual(6);
  });
});

describe('liveness before publication (Article 8.5)', () => {
  it('has the gate written, and a switch to turn it on', () => {
    expect(functionBody('publish_due_cycles')).toContain(
      "pr.verification_level = 'liveness'"
    );
    expect(ALL_SQL).toContain('require_liveness_before_publication');
  });

  it('is off, because no capture flow exists yet', () => {
    // Turning it on now would make every cycle a Quiet Day. The switch is
    // recorded rather than remembered.
    expect(FLAT).toContain("'require_liveness_before_publication', false");
  });

  it('is recorded by the service, never by a client', () => {
    expect(FLAT).toContain(
      'revoke execute on function public.record_liveness_check(uuid) from public, anon, authenticated'
    );
  });
});
