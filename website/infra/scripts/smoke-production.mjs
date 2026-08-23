const origin = 'https://unumae.app';
const locales = ['en', 'fr', 'de'];
const pages = [
  '',
  'today',
  'about',
  'how-selection-works',
  'archive',
  'community-guidelines',
  'privacy',
  'terms',
];

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const redirectChecks = [
  ['http://unumae.app/probe', `${origin}/probe`],
  ['http://www.unumae.app/probe', `${origin}/probe`],
  ['https://www.unumae.app/probe', `${origin}/probe`],
];
for (const [url, expected] of redirectChecks) {
  const response = await fetch(url, { redirect: 'manual' });
  assert(
    [301, 308].includes(response.status),
    `${url}: expected a permanent redirect`
  );
  assert(response.headers.get('location') === expected, `${url}: bad target`);
}

const routes = locales.flatMap((locale) =>
  pages.map((page) => {
    const prefix = locale === 'en' ? '' : `/${locale}`;
    return page ? `${prefix}/${page}` : prefix || '/';
  })
);
for (const route of routes) {
  const response = await fetch(`${origin}${route}`);
  assert(response.status === 200, `${route}: expected 200`);
  const html = await response.text();
  assert(
    html.includes(
      `<link rel="canonical" href="${origin}${route === '/' ? '/' : route}"`
    ),
    `${route}: incorrect canonical`
  );
  assert(html.includes('<main id="main-content"'), `${route}: missing main`);
}

const root = await fetch(origin);
for (const [header, fragment] of [
  ['strict-transport-security', 'max-age=31536000'],
  ['content-security-policy', "default-src 'self'"],
  ['x-content-type-options', 'nosniff'],
  ['x-frame-options', 'DENY'],
]) {
  assert(root.headers.get(header)?.includes(fragment), `Missing ${header}`);
}
const rootHtml = await root.text();
assert(
  rootHtml.includes('data-data-mode="live"') ||
    (await (await fetch(`${origin}/today`)).text()).includes(
      'data-data-mode="live"'
    ),
  'Public data mode is not live'
);

const health = await fetch(`${origin}/healthz`);
assert((await health.text()).trim() === 'ok', 'Health endpoint failed');

const association = await fetch(
  `${origin}/.well-known/apple-app-site-association`
);
assert(
  association.headers.get('content-type')?.includes('application/json'),
  'Apple association content type is not JSON'
);
const associationJson = await association.json();
assert(
  associationJson.applinks.details[0].appIDs.includes(
    'UB67843RJK.com.unumae.app'
  ),
  'Apple association is missing the Unumae app ID'
);

const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
assert(sitemap.includes(`${origin}/privacy`), 'Sitemap is missing Privacy');
assert(sitemap.includes(`${origin}/about`), 'Sitemap is missing support URL');

process.stdout.write(
  `Production smoke passed: ${routes.length} public routes, redirects, headers, health, sitemap, live mode and Apple association.\n`
);
