import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FORBIDDEN_SCHEMA_COLUMNS } from '@/constants/constitution';

/**
 * Article 7.2 — the refusal is enforced at schema level, so that a future
 * contributor cannot add follower mechanics by accident. The plan asked for
 * this test in Phase 1; here it is, before the first table exists.
 */
const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');

function migrationFiles(): string[] {
  if (!existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  return readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith('.sql'));
}

describe('database schema guard', () => {
  it('has a migrations directory', () => {
    expect(existsSync(MIGRATIONS_DIR)).toBe(true);
  });

  it('introduces no forbidden column', () => {
    const offences: string[] = [];

    for (const file of migrationFiles()) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      // Strip comments so that documenting the ban does not trip the ban.
      const statements = sql
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .toLowerCase();

      for (const column of FORBIDDEN_SCHEMA_COLUMNS) {
        if (new RegExp(`\\b${column}\\b`).test(statements)) {
          offences.push(`${file}: ${column}`);
        }
      }
    }

    expect(offences).toEqual([]);
  });

  it('enables row level security on every created table', () => {
    const missing: string[] = [];

    for (const file of migrationFiles()) {
      const sql = readFileSync(
        join(MIGRATIONS_DIR, file),
        'utf8'
      ).toLowerCase();
      const created = [
        ...sql.matchAll(
          /create table(?: if not exists)?\s+(?:public\.)?"?(\w+)"?/g
        ),
      ].map((match) => match[1]!);

      for (const table of created) {
        const enabled = new RegExp(
          `alter table\\s+(?:public\\.)?"?${table}"?\\s+enable row level security`
        ).test(sql);
        if (!enabled) {
          missing.push(`${file}: ${table}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});
