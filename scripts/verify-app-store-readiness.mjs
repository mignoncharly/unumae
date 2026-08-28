import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const read = (relativePath) => readFileSync(join(ROOT, relativePath), 'utf8');
const fail = (message) => {
  throw new Error(`App Store readiness: ${message}`);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const metadata = JSON.parse(read('docs/app-store-metadata.json'));
const appConfig = read('app.config.ts');
const eas = JSON.parse(read('eas.json'));
const site = read('website/src/content/site.ts');
const legal = read('website/src/content/legal.ts');
const reviewNotes = read('docs/APP_REVIEW_NOTES.md');
const handoff = read('docs/PHASE_F_RELEASE_READINESS.md');
const association = JSON.parse(
  read('website/public/.well-known/apple-app-site-association')
);

assert(metadata.name === 'Unumae', 'metadata name must be Unumae');
for (const [locale, fields] of Object.entries(metadata.localizations)) {
  assert(
    fields.subtitle.length <= 30,
    `${locale} subtitle exceeds 30 characters`
  );
  assert(
    fields.promotionalText.length <= 170,
    `${locale} promotional text exceeds 170 characters`
  );
  assert(
    fields.description.length <= 4000,
    `${locale} description exceeds 4000 characters`
  );
  assert(
    fields.keywords.length <= 100,
    `${locale} keywords exceed 100 characters`
  );
  assert(
    fields.whatsNew.length <= 4000,
    `${locale} release notes exceed 4000 characters`
  );
  for (const field of Object.values(fields)) {
    assert(!field.includes('TODO'), `${locale} metadata contains TODO`);
    assert(!field.includes('[['), `${locale} metadata contains a placeholder`);
  }
}

assert(
  Object.keys(metadata.localizations).join(',') === 'en-US,fr-FR,de-DE',
  'metadata must cover EN/FR/DE'
);
assert(
  metadata.urls.privacy === 'https://unumae.app/privacy',
  'privacy URL drifted'
);
assert(
  metadata.urls.support === 'https://unumae.app/about',
  'support URL drifted'
);
assert(
  metadata.urls.marketing === 'https://unumae.app',
  'marketing URL drifted'
);
assert(metadata.urls.terms === 'https://unumae.app/terms', 'terms URL drifted');
assert(
  metadata.urls.communityGuidelines ===
    'https://unumae.app/community-guidelines',
  'community URL drifted'
);
assert(
  metadata.urls.selection === 'https://unumae.app/how-selection-works',
  'selection URL drifted'
);

assert(
  appConfig.includes("const BUNDLE_ID = 'com.unumae.app'"),
  'bundle identifier changed'
);
assert(
  appConfig.includes('supportsTablet: false'),
  'iPad support must remain disabled'
);
assert(
  appConfig.includes(
    "associatedDomains: ['applinks:unumae.app', 'applinks:www.unumae.app']"
  ),
  'associated domains drifted'
);
assert(
  appConfig.includes('usesNonExemptEncryption: false'),
  'export compliance declaration is missing'
);
assert(
  appConfig.includes('NSPrivacyTracking: false'),
  'privacy manifest tracking declaration is missing'
);
assert(
  eas.submit.production.ios.ascAppId === '6804251671',
  'ASC app ID drifted'
);
assert(
  eas.build.production.environment === 'production',
  'production EAS environment drifted'
);
assert(
  eas.build.production.env.APP_ENV === 'production',
  'production APP_ENV drifted'
);

for (const locale of ['en', 'fr', 'de'])
  assert(site.includes(`${locale}: {`), `site is missing ${locale}`);
for (const page of ['community-guidelines', 'privacy', 'terms']) {
  assert(site.includes(`'${page}'`), `site is missing ${page}`);
}
assert(legal.includes('privacy: ['), 'privacy policy content is missing');
assert(legal.includes('terms: ['), 'terms content is missing');

const appIds =
  association.applinks?.details?.flatMap((detail) => detail.appIDs ?? []) ?? [];
assert(
  appIds.includes('UB67843RJK.com.unumae.app'),
  'Apple association app ID drifted'
);
const components = association.applinks.details.flatMap(
  (detail) => detail.components ?? []
);
for (const path of ['/today', '/archive', '/human/*']) {
  assert(
    components.some((component) => component['/'] === path),
    `Apple association is missing ${path}`
  );
}

for (const phrase of [
  'fully usable as a guest',
  'Settings -> Delete my account',
  'Quiet Day',
  'not a sweepstake or contest',
  'human reviews every portrait',
  'different moderator',
  'Sign in with Apple',
  'email six-digit code',
]) {
  assert(reviewNotes.includes(phrase), `review notes are missing: ${phrase}`);
}
for (const phrase of [
  'Human-owned completion record',
  'exact representative build',
  'npm run scan:secrets',
]) {
  assert(handoff.includes(phrase), `handoff is missing: ${phrase}`);
}

console.log('App Store readiness repository checks passed.');
console.log(
  'Owner gates remain: reviewed controller/support text, staffing targets, device screenshots, signed build, and ASC submission.'
);
