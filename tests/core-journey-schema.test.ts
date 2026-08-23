import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SQL = readdirSync(join(__dirname, '..', 'supabase', 'migrations'))
  .filter((file) => file.endsWith('.sql'))
  .map((file) =>
    readFileSync(join(__dirname, '..', 'supabase', 'migrations', file), 'utf8')
  )
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .toLowerCase();

function lastFunction(name: string): string {
  const pattern = new RegExp(
    `create or replace function public\\.${name}\\([\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;`,
    'g'
  );
  let body = '';
  for (const match of SQL.matchAll(pattern)) body = match[0] ?? '';
  return body.replace(/\s+/g, ' ');
}

describe('the core selected-Human loop', () => {
  it('exposes only the caller own journey through a no-argument RPC', () => {
    const journey = lastFunction('my_human_journey');
    expect(journey).toContain('i.user_id = (select auth.uid())');
    expect(journey).toContain("i.response = 'accepted'");
    expect(SQL).toContain(
      'revoke execute on function public.my_human_journey() from public, anon'
    );
  });

  it('allows answers only from the selected Human during their live UTC day', () => {
    const answer = lastFunction('answer_question');
    expect(answer).toContain('d.selected_user_id = (select auth.uid())');
    expect(answer).toContain("d.selection_status = 'live'");
    expect(answer).toContain("q.status = 'approved'");
    expect(answer).toContain("now() at time zone 'utc'");
    expect(answer).toContain('char_length(clean_answer) > 2000');
    expect(SQL).toContain(
      'revoke execute on function public.answer_question(uuid, text) from public, anon'
    );
  });

  it('never serves yesterday as Today after the UTC boundary', () => {
    const today = lastFunction('get_todays_human');
    expect(today).toContain(
      "d.selection_date = (now() at time zone 'utc')::date"
    );
  });
});
