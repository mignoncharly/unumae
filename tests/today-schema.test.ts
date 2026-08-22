import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');

/**
 * Both comment forms are stripped. A migration explaining *why* there is no
 * downvote must not trip the test that checks there is no downvote — and
 * `/* *\/` blocks survive a line filter that only looks for `--`.
 */
const ALL_SQL = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .map((file) => readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .toLowerCase();

const FLAT = ALL_SQL.replace(/\s+/g, ' ');

function tableBody(name: string): string {
  return (
    new RegExp(`create table public\\.${name}[\\s\\S]*?\\n\\);`).exec(
      ALL_SQL
    )?.[0] ?? ''
  );
}

describe('there is no downvote (Article 9.3)', () => {
  const votes = tableBody('question_votes');

  it('has a votes table at all', () => {
    expect(votes).toContain('question_id');
    expect(votes).toContain('user_id');
  });

  it.each(['direction', 'value', 'weight', 'is_upvote', 'polarity', 'delta'])(
    'has no %s column to set negative',
    (column) => {
      // A downvote here is not disabled, it is unrepresentable: the only thing
      // a row can say is "this person asked for this question".
      expect(votes).not.toContain(column);
    }
  );

  it('enforces one vote per person with the primary key', () => {
    expect(votes).toContain('primary key (question_id, user_id)');
  });

  it('offers removing your own vote, and nothing else', () => {
    expect(ALL_SQL).toContain('function public.unvote_question');
    expect(ALL_SQL).not.toContain('downvote');
  });
});

describe('the Remember count is never public (Article 9.4)', () => {
  it('answers only whether *you* remember someone', () => {
    expect(ALL_SQL).toContain('function public.do_i_remember');
  });

  it('has no function that counts rememberers', () => {
    const remembersCounted =
      /count\([^)]*\)[\s\S]{0,120}from public\.remembers/.test(ALL_SQL) ||
      /from public\.remembers[\s\S]{0,120}count\(/.test(ALL_SQL);

    expect(remembersCounted).toBe(false);
  });

  it('never grants the table to anonymous callers', () => {
    expect(FLAT).toContain('revoke all on public.remembers from anon');
  });

  it('lets a person see only their own library', () => {
    expect(FLAT).toContain(
      'create policy remembers_select_own on public.remembers for select to authenticated using ((select auth.uid()) = user_id)'
    );
  });
});

describe('questions are moderated before they show (Article 8.1)', () => {
  it('starts every question as pending', () => {
    expect(ALL_SQL).toContain(
      "status public.question_status not null default 'pending'"
    );
  });

  it('only ever returns approved questions', () => {
    const getQuestions =
      /function public\.get_questions[\s\S]*?as \$\$([\s\S]*?)\$\$;/.exec(
        ALL_SQL
      )?.[1];

    expect(getQuestions).toContain("q.status = 'approved'");
  });

  it('caps a question at 180 characters (Article 9.2)', () => {
    expect(FLAT).toContain(
      'check (char_length(btrim(body)) between 10 and 180)'
    );
  });

  it('rate limits how many one person can ask in a cycle', () => {
    expect(ALL_SQL).toContain('if asked_today >= 5 then');
  });
});

describe('nothing goes live unreviewed (Article 1.12)', () => {
  it('publishes only cycles whose portrait a person approved', () => {
    const publish =
      /function public\.publish_due_cycles[\s\S]*?as \$\$([\s\S]*?)\$\$;/.exec(
        ALL_SQL
      )?.[1];

    expect(publish).toContain("p.status = 'approved'");
    expect(publish).toContain("d.selection_status = 'ready'");
  });

  it('assigns the human number at publication, not at the draw', () => {
    // A cancelled cycle must not consume a number, or the Archive would have
    // gaps that mean nothing.
    const publish =
      /function public\.publish_due_cycles[\s\S]*?as \$\$([\s\S]*?)\$\$;/.exec(
        ALL_SQL
      )?.[1];

    expect(publish).toContain("nextval('public.human_number_seq')");
  });

  it('keeps a photograph unreadable until its cycle is live', () => {
    expect(FLAT).toContain(
      'create policy storage_portraits_published_read on storage.objects for select to anon, authenticated'
    );
    expect(FLAT).toContain(
      "p.status = 'approved' and d.selection_status in ('live', 'completed')"
    );
  });
});

describe('a guest reads everything (Article 6.1)', () => {
  it.each([
    'public.get_todays_human()',
    'public.get_portrait_elements(uuid)',
    'public.get_questions(uuid)',
  ])('%s is open to anon', (fn) => {
    expect(FLAT).toContain(`grant execute on function ${fn} to anon`);
  });

  it.each([
    'public.ask_question(uuid, text)',
    'public.vote_question(uuid)',
    'public.remember_human(uuid)',
  ])('%s is not', (fn) => {
    expect(FLAT).toContain(
      `revoke execute on function ${fn} from public, anon`
    );
  });
});
