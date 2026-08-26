import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const host = '127.0.0.1';
const port = 4322;
const baseUrl = `http://${host}:${port}`;
const defaultRoutes = [
  '/',
  '/today',
  '/about',
  '/how-selection-works',
  '/archive',
  '/community-guidelines',
  '/privacy',
  '/terms',
];
const routes = process.env.LIGHTHOUSE_ROUTE
  ? [process.env.LIGHTHOUSE_ROUTE]
  : defaultRoutes;
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

const failures = [];
try {
  await waitForServer();

  for (const route of routes) {
    let chrome;
    const userDataDir = mkdtempSync(join(tmpdir(), 'unumae-lighthouse-'));
    try {
      // A fresh browser prevents renderer work from one simulated-mobile audit
      // from degrading or hanging later routes in the same quality run.
      chrome = await launch({
        chromePath: chromium.executablePath(),
        chromeFlags: [
          '--headless=new',
          '--no-sandbox',
          '--disable-dev-shm-usage',
        ],
        handleSIGINT: false,
        userDataDir,
      });
      const result = await lighthouse(`${baseUrl}${route}`, {
        port: chrome.port,
        logLevel: 'error',
        output: 'json',
        onlyCategories: categories,
        formFactor: 'mobile',
        throttlingMethod: 'simulate',
      });
      if (!result?.lhr) {
        failures.push(`${route}: Lighthouse returned no report`);
        continue;
      }

      const scores = Object.fromEntries(
        categories.map((category) => [
          category,
          result.lhr.categories[category]?.score ?? 0,
        ])
      );
      process.stdout.write(
        `${route} ${categories
          .map(
            (category) => `${category}=${Math.round(scores[category] * 100)}`
          )
          .join(' ')}\n`
      );
      for (const [category, score] of Object.entries(scores)) {
        if (score < threshold) {
          const diagnostics = [
            'first-contentful-paint',
            'largest-contentful-paint',
            'speed-index',
            'total-blocking-time',
            'cumulative-layout-shift',
          ]
            .map(
              (id) => `${id}=${result.lhr.audits[id]?.displayValue ?? 'n/a'}`
            )
            .join(' ');
          const longTasks = result.lhr.audits['long-tasks']?.details?.items;
          const taskSummary = Array.isArray(longTasks)
            ? longTasks
                .slice(0, 3)
                .map(
                  (item) =>
                    `${Math.round(Number(item.duration ?? 0))}ms:${String(item.url ?? 'unknown')}`
                )
                .join(', ')
            : 'none reported';
          const mainThreadItems =
            result.lhr.audits['mainthread-work-breakdown']?.details?.items;
          const mainThreadSummary = Array.isArray(mainThreadItems)
            ? mainThreadItems
                .filter((item) => Number(item.duration ?? 0) >= 50)
                .map(
                  (item) =>
                    `${String(item.groupLabel ?? item.group ?? 'unknown')}=${Math.round(
                      Number(item.duration ?? 0)
                    )}ms`
                )
                .join(', ')
            : 'none reported';
          failures.push(
            `${route}: Lighthouse ${category} score ${Math.round(
              score * 100
            )} is below 95 (${diagnostics}; long-tasks=${taskSummary}; main-thread=${mainThreadSummary})`
          );
        }
      }
    } catch (error) {
      failures.push(`${route}: Lighthouse failed: ${error.message}`);
    } finally {
      if (chrome) {
        chrome.kill();
        chrome.process.unref();
      }
      try {
        rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5 });
      } catch {
        // Windows may retain an Account Web Data handle briefly. The uniquely
        // scoped OS-temp profile contains no user data and is safe to reap later.
      }
    }
  }
} finally {
  server.kill('SIGTERM');
  server.unref();
}

if (failures.length > 0) {
  throw new Error(`Lighthouse failures:\n- ${failures.join('\n- ')}`);
}
