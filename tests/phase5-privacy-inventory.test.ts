import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const inventory = readFileSync(
  join(root, 'docs', 'PERSONAL_DATA_INVENTORY.md'),
  'utf8'
);
const phase5 = readFileSync(
  join(
    root,
    'supabase',
    'migrations',
    '20260825130000_phase5_complete_privacy_export.sql'
  ),
  'utf8'
);
const migrations = readdirSync(join(root, 'supabase', 'migrations'))
  .filter((name) => name.endsWith('.sql'))
  .map((name) =>
    readFileSync(join(root, 'supabase', 'migrations', name), 'utf8')
  )
  .join('\n');

const createdApplicationTables = [
  ...migrations.matchAll(
    /create table(?: if not exists)? public\.([a-z0-9_]+)/gi
  ),
].map((match) => match[1]);
const droppedApplicationTables = new Set(
  [
    ...migrations.matchAll(/drop table(?: if exists)? public\.([a-z0-9_]+)/gi),
  ].map((match) => match[1])
);
const applicationTables = createdApplicationTables.filter(
  (table) => !droppedApplicationTables.has(table)
);
const inventoryTables = [...inventory.matchAll(/^\| `([a-z0-9_]+)` \|/gim)].map(
  (match) => match[1]
);
const inventoryBuckets = [
  ...inventory.matchAll(/^\| Storage `([a-z0-9_-]+)` \|/gim),
].map((match) => match[1]);
const registeredExportKeys = [
  ...inventory.matchAll(/^- Export key: `([a-z0-9_]+)`$/gim),
].map((match) => match[1]);

describe('Phase 5 maintained personal-data inventory', () => {
  it('makes an explicit decision for every application table and bucket', () => {
    expect([...new Set(inventoryTables)].sort()).toEqual(
      [...new Set(applicationTables)].sort()
    );
    expect(inventoryBuckets.sort()).toEqual(['avatars', 'portraits']);
  });

  it('records every required decision dimension', () => {
    for (const heading of [
      'Subject identifier',
      'Data fields',
      'Purpose and visibility',
      'Retention and rationale',
      'Export behavior',
      'Deletion behavior',
    ]) {
      expect(inventory).toContain(heading);
    }
  });

  it('documents retained device state and bounded synchronous export honestly', () => {
    expect(inventory).toContain('non-identifying abuse-prevention fact');
    expect(inventory).toContain('no email, provider identifier');
    expect(inventory).toContain('capped at 5 MiB');
    expect(inventory).not.toContain('exports everything');
  });

  it('keeps every registered export key implemented in the migration chain', () => {
    expect(registeredExportKeys.length).toBeGreaterThan(25);
    for (const key of registeredExportKeys) {
      expect(migrations).toContain(`'${key}'`);
    }
  });
});

describe('Phase 5 export v3 contract', () => {
  it('includes every newly applicable personal-data family', () => {
    for (const key of [
      'export_scope',
      'selection_history',
      'selection_precommits',
      'account_assurance',
      'account_review_flags',
      'reports_about_me',
      'moderation_decisions_about_me',
      'account_enforcement_history',
      'deletion_requests',
      'storage_cleanup_jobs',
      'storage_objects',
      'moderator_role',
    ]) {
      expect(phase5).toContain(`'${key}'`);
    }
  });

  it('states the withheld categories and enforces the direct-export cap', () => {
    expect(phase5).toContain("'moderator_identifiers'");
    expect(phase5).toContain("'provider_credentials'");
    expect(phase5).toContain("'abuse_detection_hashes_and_thresholds'");
    expect(phase5).toContain('pg_column_size(payload) > maximum_bytes');
    expect(phase5).toContain("errcode = 'program_limit_exceeded'");
  });

  it('removes committed membership when the account is deleted', () => {
    expect(phase5).toContain(
      'foreign key (user_id) references public.profiles (id) on delete cascade'
    );
    expect(phase5).toContain("tg_op = 'DELETE' and pg_trigger_depth() > 1");
  });
});
