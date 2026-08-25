import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');
const migration = read(
  'supabase',
  'migrations',
  '20260825150000_phase7_worker_notification_reliability.sql'
).toLowerCase();
const translator = read(
  'supabase',
  'functions',
  'translate-portraits',
  'index.ts'
);
const sender = read('supabase', 'functions', 'send-notifications', 'index.ts');
const receipts = read(
  'supabase',
  'functions',
  'process-push-receipts',
  'index.ts'
);
const push = read('src', 'features', 'notifications', 'push.ts');

describe('Phase 7 worker and notification reliability', () => {
  it('leases Edge runs and bounds every retry path', () => {
    expect(migration).toContain(
      'create or replace function public.claim_worker_run'
    );
    expect(migration).toContain("status = 'leased'");
    expect(migration).toContain("then 'dead_letter'");
    expect(migration).toContain('max_attempts integer not null default 3');
    expect(migration).toContain(
      'create or replace function public.retry_worker_runs'
    );
  });

  it('uses a shared timeout and bounded translation concurrency', () => {
    expect(translator).toContain('fetchWithTimeout');
    expect(translator).toContain('mapWithConcurrency<WorkItem, ItemOutcome>');
    expect(translator).toContain('write.error || write.data !== true');
    expect(migration).toContain('create table public.translation_failures');
  });

  it('checks Expo receipts and disables only permanent destinations', () => {
    expect(sender).toContain('enqueue_expo_push_receipt');
    expect(receipts).toContain('push/getReceipts');
    expect(receipts).toContain('complete_expo_push_receipt');
    expect(migration).toContain('create table public.expo_push_receipts');
    expect(migration).toContain('delete from public.push_tokens');
  });

  it('creates Android channels before requesting permission', () => {
    const channel = push.indexOf('setNotificationChannelAsync');
    const permission = push.indexOf('getPermissionsAsync');
    expect(channel).toBeGreaterThan(0);
    expect(permission).toBeGreaterThan(channel);
    expect(sender).toContain("channelId: 'selection'");
    expect(sender).toContain("channelId: 'general'");
  });

  it('alerts on every Phase 7 operational failure class', () => {
    for (const code of [
      'worker_repeated_failures',
      'worker_stale_lease',
      'worker_queue_depth',
      'provider_authentication',
      'notification_delivery_collapse',
      'resource_quota_approaching',
    ]) {
      expect(migration).toContain(`'${code}'`);
    }
  });
});
