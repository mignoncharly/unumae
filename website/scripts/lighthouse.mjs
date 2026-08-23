import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const host = '127.0.0.1';
const port = 4322;
const baseUrl = `http://${host}:${port}`;
const routes = [
  '/',
  '/today',
  '/about',
  '/how-selection-works',
  '/archive',
  '/community-guidelines',
  '/privacy',
  '/terms',
];
const categories = ['performance', 'accessibility', 'best-practices', 'seo'];
const threshold = 0.95;

const server = spawn(
  process.execPath,
  ['scripts/serve-dist.mjs', String(port)],
  {
    stdio: 'ignore',
  }
);

const waitForServer = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Astro preview did not start for Lighthouse.');
};

let chrome;
try {
  await waitForServer();
  chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'],
  });

  for (const route of routes) {
    const result = await lighthouse(`${baseUrl}${route}`, {
      port: chrome.port,
      logLevel: 'error',
      output: 'json',
      onlyCategories: categories,
      formFactor: 'mobile',
      throttlingMethod: 'simulate',
    });
    if (!result?.lhr) {
      throw new Error(`Lighthouse returned no report for ${route}`);
    }

    const scores = Object.fromEntries(
      categories.map((category) => [
        category,
        result.lhr.categories[category]?.score ?? 0,
      ])
    );
    process.stdout.write(
      `${route} ${categories
        .map((category) => `${category}=${Math.round(scores[category] * 100)}`)
        .join(' ')}\n`
    );
    for (const [category, score] of Object.entries(scores)) {
      if (score < threshold) {
        throw new Error(
          `${route}: Lighthouse ${category} score ${Math.round(
            score * 100
          )} is below 95`
        );
      }
    }
  }
} finally {
  chrome?.kill();
  server.kill('SIGTERM');
}
