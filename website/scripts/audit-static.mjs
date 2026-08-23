import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const dist = new URL('../dist/', import.meta.url);
const sourceRoot = new URL('../src/', import.meta.url);
const origin = 'https://quality.unumae.invalid';
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

const publicRoutes = locales.flatMap((locale) =>
  pages.map((page) => {
    const prefix = locale === 'en' ? '' : `/${locale}`;
    return page ? `${prefix}/${page}` : prefix || '/';
  })
);

const fail = (message) => {
  throw new Error(message);
};

const count = (value, pattern) => [...value.matchAll(pattern)].length;

const routeFile = (route) => {
  const clean = route === '/' ? '' : route.replace(/^\//, '');
  const candidates = [
    new URL(`${clean ? `${clean}/` : ''}index.html`, dist),
    new URL(`${clean}.html`, dist),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    fail(`No built HTML for ${route}`);
  }
  return match;
};

const walk = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const read = (url) => readFileSync(url, 'utf8');

for (const route of publicRoutes) {
  const html = read(routeFile(route));
  const expectedCanonical = new URL(route, origin).toString();
  const expectedLocale = route.startsWith('/fr')
    ? 'fr'
    : route.startsWith('/de')
      ? 'de'
      : 'en';

  if (!html.includes(`<html lang="${expectedLocale}"`)) {
    fail(`${route}: incorrect document language`);
  }
  if (count(html, /<main\b/gi) !== 1 || count(html, /<h1\b/gi) !== 1) {
    fail(`${route}: expected one main landmark and one h1`);
  }
  if (
    !html.includes('<main id="main-content"') ||
    !html.includes('tabindex="-1"')
  ) {
    fail(`${route}: skip-link target is not programmatically focusable`);
  }
  if (!html.includes(`<link rel="canonical" href="${expectedCanonical}"`)) {
    fail(`${route}: incorrect canonical URL`);
  }
  for (const hreflang of [...locales, 'x-default']) {
    if (!html.includes(`hreflang="${hreflang}"`)) {
      fail(`${route}: missing ${hreflang} alternate`);
    }
  }
  for (const marker of [
    'property="og:title"',
    'property="og:description"',
    'property="og:image"',
    'name="twitter:card" content="summary_large_image"',
    'type="application/ld+json"',
  ]) {
    if (!html.includes(marker)) {
      fail(`${route}: missing discovery marker ${marker}`);
    }
  }

  const headings = [...html.matchAll(/<h([1-6])\b/gi)].map((match) =>
    Number(match[1])
  );
  for (let index = 1; index < headings.length; index += 1) {
    if (headings[index] > headings[index - 1] + 1) {
      fail(`${route}: heading order skips a level`);
    }
  }

  const jsonLd = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
  );
  if (!jsonLd) {
    fail(`${route}: missing structured data`);
  }
  JSON.parse(jsonLd[1]);
}

const htmlFiles = walk(dist.pathname).filter(
  (path) => extname(path) === '.html'
);
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const value = match[1];
    if (
      value.startsWith('#') ||
      value.startsWith('mailto:') ||
      value.startsWith('tel:') ||
      /^[a-z]+:/i.test(value) ||
      value.startsWith('//')
    ) {
      continue;
    }

    const resolved = new URL(
      value,
      `https://audit.invalid/${relative(dist.pathname, file)}`
    );
    const pathname = decodeURIComponent(resolved.pathname);
    if (pathname.startsWith('/api/')) {
      continue;
    }
    const extension = extname(pathname);
    const cleanPath = pathname.replace(/^\//, '').replace(/\/$/, '');
    const candidates = extension
      ? [new URL(pathname.slice(1), dist)]
      : [
          new URL(cleanPath ? `${cleanPath}/index.html` : 'index.html', dist),
          ...(cleanPath ? [new URL(`${cleanPath}.html`, dist)] : []),
        ];
    if (!candidates.some((candidate) => existsSync(candidate))) {
      fail(`${relative(dist.pathname, file)}: broken local reference ${value}`);
    }
  }
}

const analyticsSource = read(new URL('scripts/analytics.ts', sourceRoot));
for (const forbidden of [
  'human_id',
  'draw_id',
  'question_id',
  'archive_entry',
  'remember',
  'popularity',
  'session',
  'userAgent',
]) {
  if (analyticsSource.includes(forbidden)) {
    fail(`Analytics source contains forbidden field: ${forbidden}`);
  }
}

const defaultBuild = read(routeFile('/'));
if (
  defaultBuild.includes('data-analytics-endpoint="https://') ||
  defaultBuild.includes('data-analytics-endpoint="//')
) {
  fail('Analytics endpoint is not same-origin');
}

const sitemap = read(new URL('sitemap-0.xml', dist));
if (sitemap.includes('/dev/') || sitemap.includes('/404')) {
  fail('Internal routes entered the sitemap');
}
for (const route of publicRoutes) {
  const canonical = new URL(route, origin).toString();
  if (!sitemap.includes(canonical)) {
    fail(`Sitemap is missing ${route}`);
  }
}

const transferFiles = walk(dist.pathname).filter((path) =>
  /\.(?:html|css|js|woff2)$/.test(path)
);
const transferBytes = transferFiles.reduce(
  (total, path) => total + statSync(path).size,
  0
);

process.stdout.write(
  `Static quality audit passed: ${publicRoutes.length} public routes, ${htmlFiles.length} HTML files, ${transferBytes} source-transfer bytes.\n`
);
