#!/usr/bin/env node
/**
 * Probes what an anonymous caller can execute, against an explicit allowlist.
 *
 *   npm run verify:privileges
 *
 * This exists because of a real hole. Postgres grants EXECUTE on new functions
 * to PUBLIC, and Supabase additionally grants it to `anon` and `authenticated`
 * by default — so a `security definer` function is world-callable the moment it
 * is created, and `revoke ... from anon` in one migration does nothing for the
 * function added in the next one.
 *
 * Reviewing migrations did not catch that. Asking the live database did.
 */

import { loadVerificationTarget } from './lib/verification-target.mjs';

/**
 * The only functions an anonymous caller may execute. Everything else must
 * answer 401.
 *
 * These three are the public verification surface (Article 12): pure functions
 * over values the caller already holds, reading no table and revealing nothing
 * about anyone.
 */
const NIL_UUID = '00000000-0000-0000-0000-000000000001';

const ANON_ALLOWED = new Set([
  // The verification surface (Article 12).
  'draw_rank',
  'draw_order',
  'pool_hash',
  // Guest viewing is a permanent right (Article 6.1). These three are the
  // whole of what a person sees without an account.
  'get_todays_human',
  'get_portrait_elements',
  'get_questions',
  'get_archive',
  'get_human',
  'get_random_human',
  'get_anniversaries',
  'get_archive_countries',
  'get_archive_years',
  'get_portrait_translations',
  // Writing an event is open to guests; reading anything back is not.
  'track_events',
  // When Year Zero ends is public — the Archive's first day is on the Archive.
  // Who is inside it is derived per row and never asked as a question.
  'year_zero_ends',
  // Article 12 — the pool, its countries and its languages. A guest who cannot
  // see how many are waiting cannot check "one in a thousand".
  'selection_stats',
  'country_representation',
  'unnamed_countries',
]);

const PROBES = [
  ['run_daily_draw', { target_date: '2027-01-01' }],
  ['escalate_draw', { target_date: '2027-01-01' }],
  ['notify_selected_candidate', { target_date: '2027-01-01' }],
  ['expire_stale_invitations', {}],
  ['accept_selection', {}],
  ['decline_selection', {}],
  ['my_pending_invitation', {}],
  ['is_eligible', { candidate_id: '00000000-0000-0000-0000-000000000001' }],
  ['has_been_selected', {}],
  ['scheduler_installed', {}],
  ['draw_order', { seed: 's', ids: [] }],
  [
    'draw_rank',
    { seed: 's', candidate: '00000000-0000-0000-0000-000000000001' },
  ],
  ['pool_hash', { ids: [] }],

  // Phase 8 — the Archive is open to guests in full (Article 6.1).
  ['get_archive', { page_limit: 1 }],
  ['get_human', { target_draw: NIL_UUID }],
  ['get_random_human', {}],
  ['get_anniversaries', {}],
  ['get_archive_countries', {}],
  ['get_archive_years', {}],

  // Phase 9 — moderation and privacy. None of this is anonymous business.
  ['is_moderator', {}],
  [
    'report_content',
    {
      report_target_type: 'question',
      report_target_id: NIL_UUID,
      report_reason: 'spam',
    },
  ],
  ['block_user', { target_user: NIL_UUID }],
  ['unblock_user', { target_user: NIL_UUID }],
  ['export_my_data', {}],
  ['review_portrait', { target_portrait: NIL_UUID, decision: 'approved' }],
  ['review_question', { target_question: NIL_UUID, decision: 'approved' }],
  ['resolve_report', { target_report: NIL_UUID, actioned: false }],
  ['set_account_status', { target_user: NIL_UUID, new_status: 'active' }],
  ['moderation_portrait_queue', {}],
  ['moderation_question_queue', {}],
  ['moderation_report_queue', {}],

  // Phase 10 — reading a translation is public; everything else is not.
  ['get_portrait_translations', { target_draw: NIL_UUID, target_locale: 'fr' }],
  ['get_notification_settings', {}],
  [
    'set_notification_settings',
    { daily: false, selected: true, answered: true, anniversary: false },
  ],
  ['register_push_token', { push_token: 'probe', device_platform: 'ios' }],
  ['unregister_push_token', { push_token: 'probe' }],
  ['notifications_due', {}],
  [
    'record_notification_sent',
    { target_user: NIL_UUID, sent_category: 'daily', key: 'probe' },
  ],
  [
    'record_translation',
    {
      target_portrait: NIL_UUID,
      target_element: 'introduction',
      target_locale: 'fr',
      text_value: 'probe',
      translation_engine: 'probe',
    },
  ],

  // Appointing a moderator is not something a moderator may do, let alone a
  // stranger. Service role only.
  ['grant_moderator', { target_email: 'probe@example.com' }],

  // Phase 11 — a guest may write an event and read nothing.
  // An empty batch, so running the probe does not pollute the analytics table.
  ['track_events', { batch_install_id: NIL_UUID, batch: [] }],
  ['analytics_kpis_guarded', {}],
  ['purge_old_analytics', {}],
  ['revoke_moderator', { target_email: 'probe@example.com' }],

  // Phase 7 — reading is open, taking part is not.
  ['get_todays_human', {}],
  ['get_portrait_elements', { target_draw: NIL_UUID }],
  ['get_questions', { target_draw: NIL_UUID }],
  ['ask_question', { target_draw: NIL_UUID, question_body: 'x'.repeat(20) }],
  ['vote_question', { target_question: NIL_UUID }],
  ['unvote_question', { target_question: NIL_UUID }],
  ['remember_human', { target_draw: NIL_UUID }],
  ['forget_human', { target_draw: NIL_UUID }],
  ['do_i_remember', { target_draw: NIL_UUID }],
  ['publish_due_cycles', {}],
  ['approve_portrait', { target_portrait: NIL_UUID }],

  // Phase 14 — the badge is readable, the retention numbers are not.
  ['year_zero_ends', {}],
  ['am_i_founding', {}],
  ['joined_in_year_zero', { joined: '2026-01-01T00:00:00Z' }],
  ['retention_cohorts', {}],
  ['participation_mix', {}],
  ['growth_gate', {}],

  // Phase 16 — every instrument is moderator-only, and the job credentials are
  // reachable by nobody at all.
  ['country_balance', {}],
  ['integrity_signals', {}],
  ['moderation_health', {}],
  ['job_history', {}],
  ['invoke_function', { function_name: 'send-notifications' }],

  // Phase 15 — the transparency numbers are public; the translation queue is not.
  ['selection_stats', {}],
  ['country_representation', {}],
  ['unnamed_countries', {}],
  ['pending_translations', {}],
  [
    'record_same_language',
    {
      target_portrait: NIL_UUID,
      target_element: 'introduction',
      target_locale: 'fr',
    },
  ],
];

/** Tables no anonymous caller may read a single row of. */
const CLOSED_TABLES = [
  'profiles',
  'draw_candidates',
  'draw_invitations',
  'portraits',
  'portrait_elements',
  'questions',
  'question_votes',
  'remembers',
  'moderators',
  'content_reports',
  'moderation_events',
  'moderation_decisions',
  'user_blocks',
  'account_flags',
  'app_settings',
  'push_tokens',
  'notification_settings',
  'notification_log',
  'portrait_element_translations',
  'founding_moderators',
  'analytics_events',
  'job_runs',
  'job_secrets',
];

const { url, publicKey: key, label: targetLabel } = loadVerificationTarget();

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
};

let failures = 0;

function report(ok, label, detail = '') {
  console.log(
    `  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`
  );
  if (!ok) failures += 1;
}

console.log(`Probing anonymous access to ${targetLabel}\n`);
console.log('functions');

for (const [name, body] of PROBES) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const allowed = ANON_ALLOWED.has(name);
  const reachable = response.status !== 401 && response.status !== 404;

  report(
    allowed === reachable,
    `${name} ${allowed ? 'open (intended)' : 'closed'}`,
    allowed === reachable ? '' : `HTTP ${response.status}`
  );
}

console.log('\ntables');

for (const table of CLOSED_TABLES) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers,
  });
  report(
    response.status === 401 || response.status === 403,
    `${table} closed`,
    response.status === 401 || response.status === 403
      ? ''
      : `HTTP ${response.status}`
  );
}

// daily_draws is readable, but only its transparency columns and only for
// cycles that have gone live.
console.log('\ndaily_draws column exposure');

const forbidden = await fetch(
  `${url}/rest/v1/daily_draws?select=selected_user_id&limit=1`,
  { headers }
);
report(
  forbidden.status === 401 || forbidden.status === 403,
  'selected_user_id not readable',
  forbidden.status === 401 || forbidden.status === 403
    ? ''
    : `HTTP ${forbidden.status}`
);

const allowedColumns = await fetch(
  `${url}/rest/v1/daily_draws?select=selection_date,candidate_pool_hash,random_seed&limit=1`,
  { headers }
);
report(
  allowedColumns.ok,
  'transparency columns readable',
  allowedColumns.ok ? '' : `HTTP ${allowedColumns.status}`
);

console.log(
  failures === 0
    ? '\nAnonymous access matches the allowlist.'
    : `\n${failures} function(s) or table(s) exposed. Fix before deploying.`
);

process.exit(failures === 0 ? 0 : 1);
