#!/usr/bin/env node
/**
 * Tries to break the database as a real, signed-in user.
 *
 *   npm run verify:security
 *
 * `verify:privileges` asks what an anonymous stranger can reach. This asks the
 * harder question: what can somebody who has legitimately signed up do that
 * they should not? Row level security is only worth what it refuses under a
 * genuine JWT, and the plan calls out reviewing those policies before
 * production as its own task.
 *
 * It creates two throwaway accounts, attacks with one against the other, and
 * deletes both. Nothing it makes is left behind.
 *
 * Needs the service role key, so it reads the local credential file and never
 * prints it.
 */

import { randomUUID } from 'node:crypto';

import { loadVerificationTarget } from './lib/verification-target.mjs';

const {
  url: URL_BASE,
  publicKey: ANON,
  secretKey: SERVICE,
  label: TARGET_LABEL,
} = loadVerificationTarget();

let failures = 0;
const created = [];

function check(passed, label, detail = '') {
  console.log(
    `  ${passed ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`
  );
  if (!passed) failures += 1;
}

async function admin(path, options = {}) {
  return fetch(`${URL_BASE}${path}`, {
    ...options,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
}

async function asUser(token, path, options = {}) {
  return fetch(`${URL_BASE}${path}`, {
    ...options,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
}

/** Creates a confirmed account and returns its id, token and profile. */
async function makeUser(label) {
  const email = `verify-${randomUUID()}@unumae.test`;
  const password = randomUUID();

  const createResponse = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true }),
  });

  if (!createResponse.ok) {
    throw new Error(`could not create ${label}: HTTP ${createResponse.status}`);
  }

  const { id } = await createResponse.json();
  created.push(id);

  const tokenResponse = await fetch(
    `${URL_BASE}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!tokenResponse.ok) {
    throw new Error(`could not sign in ${label}: HTTP ${tokenResponse.status}`);
  }

  const { access_token: token } = await tokenResponse.json();

  // A profile, created the way the app creates one.
  const profileResponse = await asUser(token, '/rest/v1/profiles', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      id,
      username: `v${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      display_name: label,
      birth_year: 1990,
      country_code: 'JP',
    }),
  });

  if (!profileResponse.ok) {
    throw new Error(
      `could not create profile for ${label}: HTTP ${profileResponse.status} ${await profileResponse.text()}`
    );
  }

  return { id, token, email };
}

async function cleanup() {
  for (const id of created) {
    await admin(`/auth/v1/admin/users/${id}`, { method: 'DELETE' }).catch(
      () => undefined
    );
  }
}

console.log(`Attacking ${TARGET_LABEL} as a signed-in user\n`);

let attacker;
let victim;

try {
  attacker = await makeUser('Attacker');
  victim = await makeUser('Victim');
} catch (error) {
  console.error(`\nSetup failed: ${error.message}`);
  await cleanup();
  process.exit(1);
}

try {
  // --- reading other people ------------------------------------------------
  console.log('reading other people');

  const otherProfile = await asUser(
    attacker.token,
    `/rest/v1/profiles?id=eq.${victim.id}&select=*`
  );
  const otherProfileRows = otherProfile.ok ? await otherProfile.json() : null;
  check(
    otherProfile.ok &&
      Array.isArray(otherProfileRows) &&
      otherProfileRows.length === 0,
    "cannot read another person's profile",
    otherProfileRows
      ? `${otherProfileRows.length} rows`
      : `HTTP ${otherProfile.status}`
  );

  const ownProfile = await asUser(
    attacker.token,
    `/rest/v1/profiles?id=eq.${attacker.id}&select=username`
  );
  const ownRows = ownProfile.ok ? await ownProfile.json() : [];
  check(ownRows.length === 1, 'can read their own profile');

  for (const table of [
    'remembers',
    'question_votes',
    'draw_candidates',
    'moderation_events',
  ]) {
    const response = await asUser(
      attacker.token,
      `/rest/v1/${table}?select=*&limit=1`
    );
    const rows = response.ok ? await response.json() : null;
    check(
      !response.ok || (Array.isArray(rows) && rows.length === 0),
      `cannot read ${table}`,
      response.ok ? `${rows?.length} rows` : `HTTP ${response.status}`
    );
  }

  // --- promoting themselves ------------------------------------------------
  console.log('\npromoting themselves');

  for (const [column, value] of [
    ['selection_eligible', true],
    ['verification_level', 'liveness'],
    ['account_status', 'active'],
    ['accepted_rules_at', new Date().toISOString()],
  ]) {
    const response = await asUser(
      attacker.token,
      `/rest/v1/profiles?id=eq.${attacker.id}`,
      { method: 'PATCH', body: JSON.stringify({ [column]: value }) }
    );
    check(
      !response.ok,
      `cannot set their own ${column}`,
      `HTTP ${response.status}`
    );
  }

  const birthYear = await asUser(
    attacker.token,
    `/rest/v1/profiles?id=eq.${attacker.id}`,
    { method: 'PATCH', body: JSON.stringify({ birth_year: 2015 }) }
  );
  check(
    !birthYear.ok,
    'cannot rewrite their own birth year',
    `HTTP ${birthYear.status}`
  );

  const moderator = await asUser(attacker.token, '/rest/v1/moderators', {
    method: 'POST',
    body: JSON.stringify({ user_id: attacker.id }),
  });
  check(
    !moderator.ok,
    'cannot make themselves a moderator',
    `HTTP ${moderator.status}`
  );

  // --- acting on other people ----------------------------------------------
  console.log('\nacting on other people');

  /*
   * A PATCH that matches no rows answers 204, which looks the same as success.
   * So the status is not the assertion — the victim's row is read back with
   * the service role, and the check is that it did not change.
   */
  await asUser(attacker.token, `/rest/v1/profiles?id=eq.${victim.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ display_name: 'Owned' }),
  });

  const victimAfter = await admin(
    `/rest/v1/profiles?id=eq.${victim.id}&select=display_name`
  );
  const victimRows = victimAfter.ok ? await victimAfter.json() : [];
  check(
    victimRows[0]?.display_name === 'Victim',
    "cannot edit another person's profile",
    `name is now "${victimRows[0]?.display_name}"`
  );

  for (const [fn, body] of [
    [
      'review_portrait',
      { target_portrait: randomUUID(), decision: 'approved' },
    ],
    [
      'review_question',
      { target_question: randomUUID(), decision: 'approved' },
    ],
    ['set_account_status', { target_user: victim.id, new_status: 'banned' }],
    ['resolve_report', { target_report: randomUUID(), actioned: true }],
    ['moderation_portrait_queue', {}],
    ['analytics_kpis_guarded', {}],
  ]) {
    const response = await asUser(attacker.token, `/rest/v1/rpc/${fn}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // The queues are readable-but-empty for a non-moderator; the actions raise.
    const text = response.ok ? await response.text() : '';
    const denied = !response.ok || text === '[]';
    check(denied, `cannot use ${fn}`, `HTTP ${response.status}`);
  }

  const grant = await asUser(attacker.token, '/rest/v1/rpc/grant_moderator', {
    method: 'POST',
    body: JSON.stringify({ target_email: attacker.email }),
  });
  check(!grant.ok, 'cannot call grant_moderator', `HTTP ${grant.status}`);

  // --- the draw ------------------------------------------------------------
  console.log('\nthe draw');

  for (const fn of [
    'run_daily_draw',
    'escalate_draw',
    'notify_selected_candidate',
  ]) {
    const response = await asUser(attacker.token, `/rest/v1/rpc/${fn}`, {
      method: 'POST',
      body: JSON.stringify({ target_date: '2027-01-01' }),
    });
    check(!response.ok, `cannot call ${fn}`, `HTTP ${response.status}`);
  }

  const identities = await asUser(
    attacker.token,
    '/rest/v1/daily_draws?select=selected_user_id&limit=1'
  );
  check(
    !identities.ok,
    'cannot read who was drawn',
    `HTTP ${identities.status}`
  );

  const transparency = await asUser(
    attacker.token,
    '/rest/v1/daily_draws?select=selection_date,random_seed&limit=1'
  );
  check(
    transparency.ok,
    'can read the transparency columns',
    `HTTP ${transparency.status}`
  );

  // --- storage -------------------------------------------------------------
  console.log('\nstorage');

  /*
   * The control first: the same request into their *own* folder must succeed.
   *
   * Without it, a refusal proves nothing — a malformed upload is rejected
   * whoever sends it, and the test would pass while the policy did nothing.
   */
  const ownObjectPath = `${attacker.id}/${randomUUID()}/photo/${randomUUID()}.jpg`;
  const ownUpload = await asUser(
    attacker.token,
    `/storage/v1/object/portraits/${ownObjectPath}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: 'probe',
    }
  );
  check(
    ownUpload.ok,
    'can upload into their own folder (the control)',
    `HTTP ${ownUpload.status}`
  );

  const foreignUpload = await asUser(
    attacker.token,
    `/storage/v1/object/portraits/${victim.id}/${randomUUID()}/photo/${randomUUID()}.jpg`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: 'probe',
    }
  );
  check(
    !foreignUpload.ok,
    "cannot upload into another person's folder",
    `HTTP ${foreignUpload.status}`
  );

  // A private object is fetched through the `authenticated` path; the bare one
  // is for public buckets and answers 400 whoever asks.
  const ownRead = await asUser(
    attacker.token,
    `/storage/v1/object/authenticated/portraits/${ownObjectPath}`
  );
  check(
    ownRead.ok,
    'can read their own object back (the control)',
    `HTTP ${ownRead.status}`
  );

  // The one that matters: somebody else's private object, before publication.
  const foreignRead = await asUser(
    victim.token,
    `/storage/v1/object/authenticated/portraits/${ownObjectPath}`
  );
  check(
    !foreignRead.ok,
    "cannot read another person's unpublished object",
    `HTTP ${foreignRead.status}`
  );

  await admin(`/storage/v1/object/portraits/${ownObjectPath}`, {
    method: 'DELETE',
  });

  // --- their own data ------------------------------------------------------
  console.log('\ntheir own data');

  const exported = await asUser(attacker.token, '/rest/v1/rpc/export_my_data', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const exportedBody = exported.ok ? await exported.json() : null;
  check(exported.ok, 'can export their own data', `HTTP ${exported.status}`);
  check(
    exportedBody?.profile?.id === attacker.id,
    'the export contains only themselves'
  );
} catch (error) {
  console.error(`\nRun failed: ${error.message}`);
  failures += 1;
} finally {
  await cleanup();
  console.log(`\ncleaned up ${created.length} throwaway account(s)`);
}

console.log(
  failures === 0
    ? '\nA signed-in user cannot reach past their own data.'
    : `\n${failures} check(s) failed. Do not ship this.`
);

process.exit(failures === 0 ? 0 : 1);
