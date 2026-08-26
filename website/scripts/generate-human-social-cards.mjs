import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const sourceRoot = join('dist', 'dev', 'human-social');
if (!existsSync(sourceRoot)) {
  process.stdout.write(
    'No Human snapshots; no person-specific cards needed.\n'
  );
  process.exit(0);
}

const targets = readdirSync(sourceRoot, { withFileTypes: true }).flatMap(
  (localeEntry) => {
    if (!localeEntry.isDirectory()) return [];
    const localeRoot = join(sourceRoot, localeEntry.name);
    return readdirSync(localeRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() || entry.name.endsWith('.html'))
      .map((entry) => ({
        locale: localeEntry.name,
        id: entry.name.replace(/\.html$/, ''),
      }));
  }
);

const host = '127.0.0.1';
const port = 4323;
const origin = `http://${host}:${port}`;
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
      if ((await fetch(origin)).ok) return;
    } catch {
      // Static server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Static server did not start for social-card rendering.');
};

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
  });
  const outputRoot = join('dist', 'social', 'human');
  mkdirSync(outputRoot, { recursive: true });

  for (const { locale, id } of targets) {
    const response = await page.goto(
      `${origin}/dev/human-social/${locale}/${id}`,
      { waitUntil: 'networkidle' }
    );
    if (!response?.ok()) {
      throw new Error(
        `Human social card failed to render for ${locale}/${id}.`
      );
    }
    await page.screenshot({
      path: join(outputRoot, `${id}-${locale}.png`),
      clip: { x: 0, y: 0, width: 1200, height: 630 },
    });
  }
  process.stdout.write(`Rendered ${targets.length} Human social card(s).\n`);
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
