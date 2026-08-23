import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import de from '../src/i18n/locales/de.json';
import en from '../src/i18n/locales/en.json';
import fr from '../src/i18n/locales/fr.json';

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
 * The plan named the thing to avoid: "COME BACK!!! 🔥🔥🔥".
 *
 * These tests are the mechanism that keeps that true — not by checking tone,
 * which nobody can test, but by fixing the set of reasons this product is
 * allowed to contact somebody at all.
 */
describe('there are exactly four reasons to send anything', () => {
  it('and they are these', () => {
    expect(FLAT).toContain(
      "create type public.notification_category as enum ( 'daily', 'selected', 'answered', 'anniversary' )"
    );
  });

  it('has no category for winning somebody back', () => {
    // Whole words only. `promote_founding_moderator` is not a marketing
    // category, and a substring match said it was.
    for (const forbidden of [
      'reengage',
      're_engage',
      'streak',
      'reminder',
      'inactive',
      'winback',
      'promo',
      'promotion',
    ]) {
      expect(ALL_SQL).not.toMatch(new RegExp(`\\b${forbidden}\\b`));
    }
  });

  it('sends nothing unless the matching switch is on', () => {
    const due = functionBody('notifications_due');
    expect(due).toContain('r.wants_daily');
    expect(due).toContain('r.wants_selected');
    expect(due).toContain('r.wants_answered');
    expect(due).toContain('r.wants_anniversary');
  });

  it('defaults the two product categories to off', () => {
    // The two that are about *you* are on; the two that are about the product
    // are off until asked for.
    expect(FLAT).toContain('daily boolean not null default false');
    expect(FLAT).toContain('anniversary boolean not null default false');
    expect(FLAT).toContain('selected boolean not null default true');
    expect(FLAT).toContain('answered boolean not null default true');
  });
});

describe('nobody is told the same thing twice', () => {
  it('records every send with a dedupe key', () => {
    expect(FLAT).toContain(
      'constraint notification_log_once unique (user_id, category, dedupe_key)'
    );
  });

  it('skips anyone already sent that key', () => {
    const due = functionBody('notifications_due');
    const guards = due.match(/from public\.notification_log l/g) ?? [];
    expect(guards.length).toBeGreaterThanOrEqual(4);
  });

  it('never tells somebody about their own day', () => {
    expect(functionBody('notifications_due')).toContain(
      'r.id <> d.selected_user_id'
    );
  });

  it('derives anniversaries only from a person’s private Remember library', () => {
    const due = functionBody('notifications_due');
    expect(due).toContain('from public.remembers remembered');
    expect(due).toContain("'anniversary'::public.notification_category");
    expect(due).toContain("today.value - interval '1 year'");
  });

  it('marks the logical event sent only after a provider accepts a channel', () => {
    const record = functionBody('record_notification_delivery');
    expect(record).toContain('if delivery_succeeded then');
    expect(record).toContain('insert into public.notification_log');
  });
});

describe('delivery is timely and private', () => {
  it('checks for newly due messages every five minutes', () => {
    expect(FLAT).toContain("'unumae-send-notifications', '*/5 * * * *'");
  });

  it('stores only a fixed-length destination hash', () => {
    expect(FLAT).toContain('destination_hash text not null');
    expect(FLAT).toContain('check (char_length(destination_hash) = 64)');
    expect(FLAT).toContain(
      'revoke all on public.notification_deliveries from anon, authenticated'
    );
  });
});

describe('the wording lives in the app, not the database', () => {
  it('returns a locale and a name, never a sentence', () => {
    const due = functionBody('notifications_due');
    expect(due).toContain('p.locale');
    // If the database wrote the copy, a notification could drift from the
    // language the rest of the product uses.
    expect(due).not.toMatch(/'meet today/i);
    expect(due).not.toMatch(/'you were selected/i);
  });

  it('is only reachable by the service role', () => {
    expect(FLAT).toContain(
      'revoke execute on function public.notifications_due() from public, anon, authenticated'
    );
  });
});

describe('a translation is added, never substituted (Article 9.6)', () => {
  it('lives in its own table, keyed by locale', () => {
    expect(FLAT).toContain('primary key (portrait_id, element_key, locale)');
  });

  it('cannot replace the original, because it comes from another function', () => {
    // get_portrait_elements returns the original and knows nothing about
    // translations; there is no code path that swaps one for the other.
    expect(functionBody('get_portrait_elements')).not.toContain('translat');
    expect(functionBody('get_portrait_translations')).toContain(
      'portrait_element_translations'
    );
  });

  it('never lets a client translate somebody else’s words', () => {
    expect(FLAT).toContain(
      'revoke execute on function public.record_translation(uuid, public.portrait_element_key, text, text, text) from public, anon, authenticated'
    );
  });

  it('records which engine produced it', () => {
    expect(FLAT).toContain('engine text not null');
  });
});

describe('what a person is told they may receive', () => {
  const locales = { en, fr, de } as const;

  it.each(Object.entries(locales))('%s names all four categories', (_l, t) => {
    for (const key of [
      'daily',
      'selected',
      'answered',
      'anniversary',
    ] as const) {
      expect(t.notifications.categories[key].label.length).toBeGreaterThan(2);
      expect(t.notifications.categories[key].example.length).toBeGreaterThan(5);
    }
  });

  it.each(Object.entries(locales))('%s promises no nagging', (_l, t) => {
    expect(t.notifications.promise.length).toBeGreaterThan(40);
  });

  it.each(Object.entries(locales))(
    '%s translates invitation actions',
    (_l, t) => {
      expect(t.notifications.actions.accept).toBeTruthy();
      expect(t.notifications.actions.decline).toBeTruthy();
    }
  );

  it.each(Object.entries(locales))(
    '%s offers the original alongside a translation',
    (_l, t) => {
      expect(t.translation.showOriginal).toBeTruthy();
      expect(t.translation.showTranslated).toBeTruthy();
    }
  );
});
