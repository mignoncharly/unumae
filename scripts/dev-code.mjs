#!/usr/bin/env node
/**
 * Prints a sign-in code for an address, without sending any email.
 *
 *   npm run dev:code -- you@example.com
 *
 * Supabase will not let you edit the email templates until custom SMTP is
 * configured, and its built-in sender is rate limited to a handful of messages
 * an hour. Until SMTP is set up, the emails that arrive are the stock ones —
 * which carry a link, and a link cannot complete the app's code flow.
 *
 * This asks the admin API to mint the same one-time code the email would have
 * carried and prints it, so the app can be tested end to end in the meantime.
 * The app is unchanged: it verifies this code exactly as it would verify one
 * that arrived by email.
 *
 * A development tool. It needs the service role key, so it can only be run by
 * somebody who already has the credential file, and it works for any address —
 * which is precisely why it is not something to leave lying around a server.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const CREDENTIALS_FILE =
  process.env.CREDENTIALS_FILE ?? join(ROOT, 'docs', 'supa_keys.md');

const email = process.argv[2];

if (!email || !email.includes('@')) {
  console.error('Usage: npm run dev:code -- you@example.com');
  process.exit(1);
}

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

const { project_url: url, service_role_secret: serviceKey } = creds;

if (!url || !serviceKey) {
  console.error('Credential file needs project_url and service_role_secret.');
  process.exit(1);
}

/*
 * `magiclink` for somebody who already exists, `signup` for somebody who does
 * not — the admin API rejects the wrong one rather than choosing for you. Both
 * return the same `email_otp`, which is the code the app is waiting for.
 */
async function generate(type) {
  const response = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, email }),
  });

  return { ok: response.ok, body: await response.json() };
}

let result = await generate('magiclink');

if (!result.ok) {
  result = await generate('signup');
}

if (!result.ok) {
  console.error(
    `Could not generate a code: ${JSON.stringify(result.body).slice(0, 200)}`
  );
  process.exit(1);
}

// Older gotrue nests these under `properties`; this project returns them at the
// top level. Read both rather than depending on which one you happen to get.
const code = result.body.email_otp ?? result.body.properties?.email_otp;

if (!code) {
  console.error('No email_otp in the response.');
  process.exit(1);
}

console.log(`\n  ${email}\n`);
console.log(`  code:  ${code}\n`);
console.log('  Enter it in the app. It expires in an hour and works once.\n');
