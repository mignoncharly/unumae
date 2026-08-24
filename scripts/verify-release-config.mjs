#!/usr/bin/env node

/**
 * Read-only hosted Auth release check.
 *
 * A broad `supabase config push` is deliberately not used: the repository's
 * local Apple provider is disabled because its secret must not be committed,
 * while Apple is enabled on the hosted project. This script checks the exact
 * hosted settings without changing or printing credentials.
 */

const projectRef = process.env.SUPABASE_PROJECT_REF ?? 'qpicjsjxdblrxdrdibge';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.error(
    'SUPABASE_ACCESS_TOKEN is required. Create a scoped personal access token, then rerun npm run verify:release-config.'
  );
  process.exit(2);
}

const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
  { headers: { Authorization: `Bearer ${accessToken}` } }
);

if (!response.ok) {
  console.error(`Could not read hosted Auth config (HTTP ${response.status}).`);
  process.exit(2);
}

const config = await response.json();
const allowList = Array.isArray(config.uri_allow_list)
  ? config.uri_allow_list
  : String(config.uri_allow_list ?? '')
      .split(',')
      .map((entry) => entry.trim());

const templates = [
  config.mailer_templates_confirmation_content,
  config.mailer_templates_magic_link_content,
];

const checks = [
  ['production Site URL', config.site_url === 'https://unumae.app'],
  [
    'native redirect URL',
    allowList.some(
      (entry) => entry === 'onehuman://' || entry === 'onehuman://**'
    ),
  ],
  [
    'web redirect URL',
    allowList.some(
      (entry) =>
        entry === 'https://unumae.app/**' || entry === 'https://unumae.app'
    ),
  ],
  ['Sign in with Apple enabled', config.external_apple_enabled === true],
  [
    'confirmation and magic-link code templates',
    templates.every(
      (template) =>
        typeof template === 'string' &&
        template.includes('{{ .Token }}') &&
        !template.includes('{{ .ConfirmationURL }}')
    ),
  ],
  [
    'custom SMTP configured',
    Boolean(
      config.smtp_host && config.smtp_admin_email && config.smtp_sender_name
    ),
  ],
];

let failures = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}`);
  if (!passed) failures += 1;
}

if (failures > 0) {
  console.error(`\n${failures} hosted Auth release check(s) failed.`);
  process.exit(1);
}

console.log('\nHosted Auth configuration is ready for beta.');
