import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');

const ALL_SQL = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/comment on [\s\S]*?;/gi, '')
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .toLowerCase();

const FLAT = ALL_SQL.replace(/\s+/g, ' ');

/** The last definition wins — `create or replace` replaces what came before. */
function lastFunctionBody(name: string): string {
  const matches = [
    ...ALL_SQL.matchAll(
      new RegExp(
        `create or replace function public\\.${name}\\b[\\s\\S]*?\\n\\$\\$;`,
        'g'
      )
    ),
  ];

  return matches.at(-1)?.[0] ?? '';
}

/**
 * Phase 16 adds instruments for running this at ten thousand people, and every
 * one of them is a monitor rather than a control.
 *
 * That is the entire risk of the phase. At scale the tempting move is to let
 * the measurements steer the product — balance the draw by country, weight
 * against suspicious accounts, chase the people who went quiet. Each would be a
 * reasonable engineering decision, and each would break something the product
 * has promised in writing. So the promises are tested, not remembered.
 */
describe('the draw learns nothing from the instruments', () => {
  const draw = lastFunctionBody('run_daily_draw');
  const eligible = lastFunctionBody('is_eligible');
  const order = lastFunctionBody('draw_order');

  it.each([
    ['run_daily_draw', () => draw],
    ['is_eligible', () => eligible],
    ['draw_order', () => order],
  ])('%s never mentions country', (_name, body) => {
    const sql = body();
    expect(sql).not.toBe('');
    // Article 5.2 — the draw takes eligibility and chance. A draw balanced by
    // country is a draw with a third input, and "why was this person selected?"
    // stops having an answer anybody can check.
    expect(sql).not.toContain('country');
  });

  it.each([
    ['run_daily_draw', () => draw],
    ['is_eligible', () => eligible],
  ])('%s never mentions an integrity signal', (_name, body) => {
    const sql = body();
    expect(sql).not.toBe('');
    expect(sql).not.toContain('integrity');
    expect(sql).not.toContain('burst');
    expect(sql).not.toContain('collision');
  });

  it('eligibility is not affected by declining', () => {
    // Article 5.5 — declining costs you nothing. The structural version: the
    // eligibility test cannot see a response at all.
    const sql = lastFunctionBody('is_eligible');
    expect(sql).not.toContain('draw_invitations');
    expect(sql).not.toContain('declined');
    expect(sql).not.toContain('expired');
  });
});

describe('the instruments are moderator-only', () => {
  it.each(['country_balance', 'integrity_signals', 'moderation_health'])(
    '%s checks inside the function, not merely at the grant',
    (fn) => {
      const body = lastFunctionBody(fn);
      expect(body).not.toBe('');
      expect(body).toContain('is_moderator()');
      expect(body).toContain('insufficient_privilege');
    }
  );

  it.each(['country_balance', 'integrity_signals', 'moderation_health'])(
    '%s is never granted to anon',
    (fn) => {
      expect(FLAT).not.toMatch(
        new RegExp(
          `grant execute on function public\\.${fn}\\([^)]*\\) to [^;]*anon`
        )
      );
    }
  );
});

/**
 * The anti-fraud that this schema deliberately cannot do.
 *
 * Phase 11 decided analytics would have nowhere to put an IP address, a device
 * model or an advertising identifier. Phase 16 is where that bill arrives: the
 * usual answer to multi-accounting is device fingerprinting, and it is not
 * available. The signals that exist are weaker on purpose, and this test stops
 * a future contributor from solving the problem the easy way.
 */
describe('integrity signals cannot become tracking', () => {
  const signals = lastFunctionBody('integrity_signals');

  it('reads nothing that identifies a device', () => {
    expect(signals).not.toBe('');
    for (const forbidden of [
      'ip_address',
      'user_agent',
      'device_id',
      'device_model',
      'idfa',
      'advertising',
      'fingerprint',
      'latitude',
      'longitude',
    ]) {
      expect(signals).not.toContain(forbidden);
    }
  });

  it('does not write anywhere', () => {
    // A monitor that can act is not a monitor. It is declared `stable`, which
    // Postgres itself enforces — a write inside would raise at runtime.
    expect(signals).toContain('stable');
    expect(signals).not.toMatch(/\binsert into\b/);
    expect(signals).not.toMatch(/\bupdate public\./);
    expect(signals).not.toMatch(/\bdelete from\b/);
  });
});

describe('country balance is a monitor', () => {
  const balance = lastFunctionBody('country_balance');

  it('does not write anywhere', () => {
    expect(balance).toContain('stable');
    expect(balance).not.toMatch(/\binsert into\b/);
    expect(balance).not.toMatch(/\bupdate public\./);
  });

  it('compares the pool against the Archive', () => {
    expect(balance).toContain('is_eligible');
    expect(balance).toContain('human_number is not null');
  });
});
