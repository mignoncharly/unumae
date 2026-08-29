#!/usr/bin/env node

/**
 * Removes the developer pages from the built site.
 *
 * `/dev/*` is a styleguide, a share-card harness and the social-card templates.
 * They were excluded from the sitemap and disallowed in robots.txt, which
 * stops them being *listed* — it does not stop them being served. A page
 * anyone can open by typing its address is a shipped page, and an unfinished
 * one on a production domain is exactly what an App Store reviewer follows the
 * support URL to find.
 *
 * This runs last rather than at route level because the build genuinely needs
 * them: generate-human-social-cards.mjs renders /dev/human-social/* to produce
 * the Open Graph images. So they are built, used, and then taken out.
 */
import { readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist');
const DEV_DIR = join(DIST, 'dev');

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Belt and braces: prove the removal rather than trusting the rm. */
async function findDevRoutes(directory, prefix = '') {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const found = [];
  for (const entry of entries) {
    const route = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name === 'dev') found.push(route);
      found.push(...(await findDevRoutes(join(directory, entry.name), route)));
    }
  }
  return found;
}

if (!(await exists(DIST))) {
  console.error('No dist/ to strip. Run the build first.');
  process.exit(1);
}

const had = await exists(DEV_DIR);
if (had) await rm(DEV_DIR, { recursive: true, force: true });

const remaining = await findDevRoutes(DIST);
if (remaining.length > 0) {
  console.error('Developer routes are still present in the build:');
  for (const route of remaining) console.error(`  ${route}`);
  process.exit(1);
}

process.stdout.write(
  `${
    had
      ? 'Stripped /dev/* from the production build.'
      : 'No /dev/* routes were present in the build.'
  }
`
);
