import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SAFETY = readFileSync(
  join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20260823180000_complete_safety_privacy.sql'
  ),
  'utf8'
).toLowerCase();

const ACTIONS = readFileSync(
  join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20260823190000_moderation_actions_and_appeals.sql'
  ),
  'utf8'
).toLowerCase();

const DELETE_ACCOUNT = readFileSync(
  join(__dirname, '..', 'supabase', 'functions', 'delete-account', 'index.ts'),
  'utf8'
);

const CACHE_BOUNDARY = readFileSync(
  join(
    __dirname,
    '..',
    'src',
    'components',
    'shared',
    'SessionCacheBoundary.tsx'
  ),
  'utf8'
);

const EXPORT_FILE = readFileSync(
  join(__dirname, '..', 'src', 'features', 'privacy', 'export.ts'),
  'utf8'
);

describe('Phase 2 safety effects', () => {
  it('requires a concrete report resolution', () => {
    expect(ACTIONS).toContain('report_resolution_action');
    for (const action of [
      'dismiss',
      'remove_content',
      'suspend_account',
      'ban_account',
    ]) {
      expect(ACTIONS).toContain(`'${action}'`);
    }
    expect(ACTIONS).not.toContain(
      'resolve_report(\n  target_report uuid,\n  actioned boolean'
    );
  });

  it('can remove approved questions and published portraits', () => {
    expect(ACTIONS).toContain("status in ('pending', 'approved')");
    expect(ACTIONS).toContain("draw_status in ('live', 'completed')");
    expect(ACTIONS).toContain('redacted_at = coalesce(redacted_at, now())');
  });

  it('returns the complete portrait and report target to moderators', () => {
    expect(ACTIONS).toContain('responses jsonb');
    expect(ACTIONS).toContain('target_content text');
    expect(ACTIONS).toContain('target_photo_path text');
  });

  it('resolves blocks through content and exposes only an opaque block id', () => {
    expect(SAFETY).toContain('block_content_author');
    expect(SAFETY).toContain('block_id uuid');
    expect(SAFETY).not.toContain('returns table (\n  blocked_id uuid');
    expect(SAFETY).toContain(
      'revoke execute on function public.block_user(uuid) from authenticated'
    );
  });

  it('enforces a different appeal reviewer in schema and function', () => {
    expect(SAFETY).toContain('moderation_appeals_different_reviewer');
    expect(ACTIONS).toContain(
      "raise exception 'appeals require a different moderator'"
    );
  });

  it('audits appeal and Archive-removal reviews', () => {
    for (const action of [
      'appeal_upheld',
      'appeal_overturned',
      'archive_removal_approved',
      'archive_removal_declined',
    ]) {
      expect(SAFETY).toContain(`'${action}'`);
      expect(ACTIONS).toContain(`'${action}'`);
    }
  });

  it('keeps a tombstone while hiding every identifying field', () => {
    expect(SAFETY).toContain(
      'case when d.redacted_at is null then pr.display_name end'
    );
    expect(SAFETY).toContain(
      'case when d.redacted_at is null then po.photo_path end'
    );
    expect(SAFETY).toContain(
      '(d.redacted_at is not null or d.selected_user_id is null)'
    );
  });
});

describe('Phase 2 privacy effects', () => {
  it('exports every personal-data family', () => {
    for (const section of [
      'account',
      'profile',
      'selection_history',
      'invitations',
      'portraits',
      'questions_authored',
      'question_votes',
      'humans_i_remember',
      'notification_settings',
      'notifications_sent',
      'analytics_events',
      'reports_i_made',
      'blocked_people',
      'moderation_decisions_about_me',
      'appeals',
      'archive_removal_requests',
    ]) {
      expect(SAFETY).toContain(`'${section}'`);
    }
  });

  it('unregisters all push tokens before auth sign-out', () => {
    expect(SAFETY).toContain('unregister_my_push_tokens');
    expect(SAFETY).toContain('delete from public.push_tokens');
  });

  it('deletes portrait photographs and optional media with the account', () => {
    expect(DELETE_ACCOUNT).toContain(".select('photo_path, media_path')");
    expect(DELETE_ACCOUNT).toContain(".from('portraits')");
    expect(DELETE_ACCOUNT).toContain('.remove([...new Set(portraitFiles)])');
  });

  it('treats an unmarked upgrade cache as untrusted', () => {
    expect(CACHE_BOUNDARY).toContain('if (previous !== identity)');
    expect(CACHE_BOUNDARY).not.toContain(
      'previous !== null && previous !== identity'
    );
  });

  it('deletes the temporary export after the native sheet closes', () => {
    expect(EXPORT_FILE).toContain('finally');
    expect(EXPORT_FILE).toContain('file.delete()');
  });
});
