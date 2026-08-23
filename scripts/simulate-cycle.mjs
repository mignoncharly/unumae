#!/usr/bin/env node
/**
 * Runs the whole daily loop, end to end, in about a minute.
 *
 *   npm run simulate            two cycles, then cleans up after itself
 *   npm run simulate -- --keep  leaves the data in place to look at in the app
 *   npm run simulate -- --clean removes anything a previous run left behind
 *
 * The plan asks for exactly this before the internal alpha: "on simule
 * plusieurs jours rapidement". A cycle takes three real days — freeze at D-2,
 * accept, write, review, publish — so nobody would ever exercise the loop
 * end to end if it had to be done by waiting.
 *
 * Everything it creates is marked: accounts at @unumae.sim, usernames prefixed
 * `sim`. Cleanup deletes the accounts, the draws it made, and rewinds the human
 * number sequence, so the Archive is not left with people who never existed.
 *
 * Uses the service role, so it reads the local credential file and never
 * prints it.
 */

import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const CREDENTIALS_FILE =
  process.env.CREDENTIALS_FILE ?? join(ROOT, 'docs', 'supa_keys.md');

const KEEP = process.argv.includes('--keep');
const CLEAN_ONLY = process.argv.includes('--clean');

const SIM_DOMAIN = 'unumae.sim';
const SIM_PREFIX = 'sim';
const CANDIDATES = 12;

if (!existsSync(CREDENTIALS_FILE)) {
  console.error(`No credential file at ${CREDENTIALS_FILE}.`);
  process.exit(1);
}

const creds = Object.fromEntries(
  readFileSync(CREDENTIALS_FILE, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('='))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    })
);

const URL_BASE = creds.project_url;
const ANON = creds.publishable_key;
const SERVICE = creds.service_role_secret;

if (!URL_BASE || !ANON || !SERVICE) {
  console.error(
    'Credential file needs project_url, publishable_key and service_role_secret.'
  );
  process.exit(1);
}

let failures = 0;

function step(passed, label, detail = '') {
  console.log(
    `  ${passed ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`
  );
  if (!passed) failures += 1;
  return passed;
}

const svc = (path, options = {}) =>
  fetch(`${URL_BASE}${path}`, {
    ...options,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

const asUser = (token, path, options = {}) =>
  fetch(`${URL_BASE}${path}`, {
    ...options,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

const rpc = (path, body = {}) =>
  svc(`/rest/v1/rpc/${path}`, { method: 'POST', body: JSON.stringify(body) });

const utcDate = (offsetDays = 0) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function cleanup() {
  console.log('\ncleaning up');

  // Simulated accounts, found by their marked email domain.
  const list = await svc('/auth/v1/admin/users?per_page=200');
  const { users = [] } = list.ok ? await list.json() : {};
  const simulated = users.filter((user) =>
    (user.email ?? '').endsWith(`@${SIM_DOMAIN}`)
  );

  for (const user of simulated) {
    await svc(`/auth/v1/admin/users/${user.id}`, { method: 'DELETE' }).catch(
      () => undefined
    );
  }
  step(true, `removed ${simulated.length} simulated account(s)`);

  /*
   * The draws themselves.
   *
   * daily_draws is append-only in the product — nothing in the app can delete
   * a row, which is what makes the fairness record worth anything. The service
   * role can, and this is the one place that is correct: a cycle that never
   * happened must not sit in the Archive with a human number.
   */
  const removed = await svc(
    `/rest/v1/daily_draws?selection_date=gte.${utcDate(-7)}&selection_date=lte.${utcDate(2)}`,
    { method: 'DELETE', headers: { Prefer: 'return=representation' } }
  );
  const removedRows = removed.ok ? await removed.json() : [];
  step(removed.ok, `removed ${removedRows.length} simulated draw(s)`);

  // Rewind the sequence so the next real Human is not #14.
  const rewind = await svc('/rest/v1/rpc/rewind_human_numbers', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  step(rewind.ok, 'rewound the human number sequence', `HTTP ${rewind.status}`);
}

if (CLEAN_ONLY) {
  await cleanup();
  process.exit(failures === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

/** A confirmed account with a finished profile, old enough and verified. */
async function makeCandidate(index) {
  const email = `${SIM_PREFIX}-${randomUUID()}@${SIM_DOMAIN}`;
  const password = randomUUID();

  const created = await svc('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!created.ok) {
    throw new Error(`create user: HTTP ${created.status}`);
  }
  const { id } = await created.json();

  const signIn = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const { access_token: token } = await signIn.json();

  const profile = await asUser(token, '/rest/v1/profiles', {
    method: 'POST',
    body: JSON.stringify({
      id,
      username: `${SIM_PREFIX}${randomUUID().replace(/-/g, '').slice(0, 10)}`,
      display_name: ['Aya', 'Bashir', 'Chidi', 'Dilara', 'Eero', 'Fatou'][
        index % 6
      ],
      birth_year: 1985 + (index % 20),
      country_code: ['JP', 'CM', 'BR', 'DE', 'FR', 'IN'][index % 6],
    }),
  });
  if (!profile.ok) {
    throw new Error(
      `create profile: HTTP ${profile.status} ${await profile.text()}`
    );
  }

  /*
   * What the real system does over a week, done here in one statement:
   * backdate the account past the seven-day bar, mark it verified, accept the
   * rules, and let the nightly refresh judge it eligible.
   */
  await svc(`/rest/v1/profiles?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      created_at: new Date(Date.now() - 30 * 86400_000).toISOString(),
      verification_level: 'email',
      accepted_rules_at: new Date().toISOString(),
    }),
  });

  return { id, token, email };
}

// ---------------------------------------------------------------------------
// One cycle
// ---------------------------------------------------------------------------

async function runCycle(date, people, moderator, { publish }) {
  console.log(`\ncycle ${date}`);

  const draw = await rpc('run_daily_draw', { target_date: date });
  if (
    !step(
      draw.ok,
      'the pool was frozen and a Human drawn',
      `HTTP ${draw.status}`
    )
  ) {
    return null;
  }

  const notified = await rpc('notify_selected_candidate', {
    target_date: date,
  });
  step(notified.ok, 'the candidate was told they were selected');

  // Who was drawn — readable only with the service role, which is the point.
  const drawRow = await svc(
    `/rest/v1/daily_draws?selection_date=eq.${date}&select=id,selected_user_id,candidate_count`
  );
  const [row] = await drawRow.json();
  const selected = people.find((person) => person.id === row?.selected_user_id);

  if (
    !step(
      Boolean(selected),
      'the drawn person is one of ours',
      `pool of ${row?.candidate_count}`
    )
  ) {
    return null;
  }

  const accepted = await asUser(
    selected.token,
    '/rest/v1/rpc/accept_selection',
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );
  const acceptedValue = accepted.ok ? await accepted.json() : false;
  step(acceptedValue === true, 'they accepted, inside the 12-hour window');

  const started = await asUser(
    selected.token,
    '/rest/v1/rpc/start_my_portrait',
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );
  const portraitId = started.ok ? await started.json() : null;
  if (!step(Boolean(portraitId), 'a portrait draft was created')) {
    return null;
  }

  const answers = [
    ['introduction', 'I fix bicycles and I am not very good at endings.'],
    ['where_im_from', 'A town where the bus stops running at ten.'],
    ['today_i_feel', 'Tired in the good way. I finished something.'],
    ['something_i_love', 'The five minutes before the shop opens.'],
    ['something_misunderstood', 'People read politeness here as distance.'],
  ];

  for (const [key, answer] of answers) {
    await asUser(selected.token, '/rest/v1/portrait_elements', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        portrait_id: portraitId,
        element_key: key,
        answer,
      }),
    });
  }

  await asUser(
    selected.token,
    `/storage/v1/object/portraits/${selected.id}/photo.jpg`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: 'simulated-photograph',
    }
  );
  await asUser(selected.token, `/rest/v1/portraits?id=eq.${portraitId}`, {
    method: 'PATCH',
    body: JSON.stringify({ photo_path: `${selected.id}/photo.jpg` }),
  });

  const submitted = await asUser(
    selected.token,
    '/rest/v1/rpc/submit_my_portrait',
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );
  const submittedValue = submitted.ok ? await submitted.json() : false;
  step(submittedValue === true, 'the portrait was submitted for review');

  // Nothing reaches the world unreviewed (Article 1.12).
  const queue = await asUser(
    moderator.token,
    '/rest/v1/rpc/moderation_portrait_queue',
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );
  const queued = queue.ok ? await queue.json() : [];
  step(
    queued.some((item) => item.portrait_id === portraitId),
    'it appeared in the moderation queue'
  );

  const reviewed = await asUser(
    moderator.token,
    '/rest/v1/rpc/review_portrait',
    {
      method: 'POST',
      body: JSON.stringify({
        target_portrait: portraitId,
        decision: 'approved',
      }),
    }
  );
  step(reviewed.ok, 'a moderator approved it');

  if (!publish) {
    // An older cycle: mark it as having run and finished, so the Archive has
    // something in it.
    await svc(`/rest/v1/daily_draws?id=eq.${row.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        selection_status: 'completed',
        published_at: new Date().toISOString(),
      }),
    });
    await rpc('assign_human_number', { target_draw: row.id });
    step(true, 'it went into the Archive');
    return { drawId: row.id, selected };
  }

  const published = await rpc('publish_due_cycles');
  const count = published.ok ? await published.json() : 0;
  step(count >= 1, 'it went live', `${count} cycle(s) published`);

  return { drawId: row.id, selected };
}

// ---------------------------------------------------------------------------
// The audience
// ---------------------------------------------------------------------------

async function exerciseAudience(drawId, people, moderator, selected) {
  console.log('\nthe audience');

  const guest = await fetch(`${URL_BASE}/rest/v1/rpc/get_todays_human`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  const [human] = guest.ok ? await guest.json() : [];
  step(
    Boolean(human),
    'a guest can see Today’s Human',
    human?.display_name ?? ''
  );
  step(
    Boolean(human?.human_number),
    'they have a human number',
    `#${human?.human_number}`
  );
  // Everyone in a simulation joined before the Archive started, so they are all
  // Founding Humans. What matters is that the badge arrives derived — nothing
  // in this script ever set it.
  step(
    human?.founding === true,
    'the badge says Year Zero, without anyone setting it'
  );

  const askers = people
    .filter((person) => person.id !== selected.id)
    .slice(0, 3);
  const questionIds = [];

  for (const [index, asker] of askers.entries()) {
    const asked = await asUser(asker.token, '/rest/v1/rpc/ask_question', {
      method: 'POST',
      body: JSON.stringify({
        target_draw: drawId,
        question_body: [
          'What is something people misunderstand about where you live?',
          'What does an ordinary Tuesday look like for you?',
          'What is the last thing that made you laugh out loud?',
        ][index],
      }),
    });
    if (asked.ok) {
      questionIds.push(await asked.json());
    }
  }
  step(questionIds.length === 3, 'three people asked a question');

  // Questions are pending until a person approves them (Article 8.1).
  const beforeApproval = await fetch(`${URL_BASE}/rest/v1/rpc/get_questions`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ target_draw: drawId }),
  });
  const pending = beforeApproval.ok ? await beforeApproval.json() : [];
  step(pending.length === 0, 'none of them are visible before review');

  for (const id of questionIds) {
    await asUser(moderator.token, '/rest/v1/rpc/review_question', {
      method: 'POST',
      body: JSON.stringify({ target_question: id, decision: 'approved' }),
    });
  }

  const afterApproval = await fetch(`${URL_BASE}/rest/v1/rpc/get_questions`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ target_draw: drawId }),
  });
  const visible = afterApproval.ok ? await afterApproval.json() : [];
  step(visible.length === 3, 'after review, all three are visible');

  // Voting twice must not count twice.
  const voter = askers[0];
  await asUser(voter.token, '/rest/v1/rpc/vote_question', {
    method: 'POST',
    body: JSON.stringify({ target_question: questionIds[0] }),
  });
  await asUser(voter.token, '/rest/v1/rpc/vote_question', {
    method: 'POST',
    body: JSON.stringify({ target_question: questionIds[0] }),
  });

  const counted = await fetch(`${URL_BASE}/rest/v1/rpc/get_questions`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ target_draw: drawId }),
  });
  const withVotes = counted.ok ? await counted.json() : [];
  const votedQuestion = withVotes.find((item) => item.id === questionIds[0]);
  step(
    votedQuestion?.votes === 1,
    'voting twice still counts once',
    `${votedQuestion?.votes} vote(s)`
  );

  const remembered = await asUser(voter.token, '/rest/v1/rpc/remember_human', {
    method: 'POST',
    body: JSON.stringify({ target_draw: drawId }),
  });
  step(remembered.ok, 'somebody remembered them');

  // And the count of that is visible to nobody (Article 9.4).
  const countAttempt = await fetch(
    `${URL_BASE}/rest/v1/remembers?select=*&draw_id=eq.${drawId}`,
    { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
  );
  step(!countAttempt.ok, 'how many remembered them is visible to nobody');
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

console.log(`Simulating the loop against ${URL_BASE}\n`);
console.log('people');

const people = [];
let moderator;

try {
  for (let index = 0; index < CANDIDATES; index += 1) {
    people.push(await makeCandidate(index));
  }
  step(
    people.length === CANDIDATES,
    `${CANDIDATES} candidates signed up and finished onboarding`
  );

  moderator = people[0];
  await svc('/rest/v1/moderators', {
    method: 'POST',
    body: JSON.stringify({
      user_id: moderator.id,
      note: 'Simulation moderator',
    }),
  });
  step(true, 'one of them is a moderator');

  const refreshed = await rpc('refresh_selection_eligibility');
  const changed = refreshed.ok ? await refreshed.json() : 0;
  step(
    changed >= CANDIDATES,
    'the nightly eligibility refresh admitted them',
    `${changed} changed`
  );

  // Yesterday's cycle is archived rather than published, so the Archive has
  // something to show and today has a predecessor. Its return value is not
  // needed — only its existence is.
  await runCycle(utcDate(-1), people, moderator, { publish: false });
  const today = await runCycle(utcDate(0), people, moderator, {
    publish: true,
  });

  if (today) {
    await exerciseAudience(today.drawId, people, moderator, today.selected);
  }

  console.log('\nthe archive');
  const archive = await fetch(`${URL_BASE}/rest/v1/rpc/get_archive`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ page_limit: 10 }),
  });
  const entries = archive.ok ? await archive.json() : [];
  step(
    entries.length >= 2,
    'both cycles are in the Archive',
    `${entries.length} entries`
  );
  step(
    entries.every((entry) => entry.human_number !== null),
    'every entry has a number'
  );
} catch (error) {
  console.error(`\nRun failed: ${error.message}`);
  failures += 1;
} finally {
  if (KEEP) {
    console.log('\n--keep: leaving the simulated data in place.');
    console.log('Run `npm run simulate -- --clean` when you are done with it.');
  } else {
    await cleanup();
  }
}

console.log(
  failures === 0
    ? '\nThe loop works end to end.'
    : `\n${failures} step(s) failed.`
);

process.exit(failures === 0 ? 0 : 1);
