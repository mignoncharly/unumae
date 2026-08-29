import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

function source(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

/**
 * The developer screens are instruments, not features.
 *
 * They shipped visible to everybody for eleven phases before a screenshot from
 * a real device caught it: the Settings screen listed the Supabase project
 * reference, the connection status, and links into the design-token, component,
 * UX-preview and share-card screens, with no guard of any kind.
 *
 * Beyond being untidy it is an App Store risk — debug surfaces in a shipped app
 * read as unfinished to a reviewer. So both halves of the fix are asserted
 * here, because the obvious half is not the sufficient one.
 */
describe('developer surfaces do not ship', () => {
  it('the Settings section is behind __DEV__', () => {
    const settings = source('src/app/(tabs)/settings.tsx');

    expect(settings).toContain('{__DEV__ ?');

    // The guard has to come before the project reference, not merely exist
    // somewhere in the file.
    const guard = settings.indexOf('{__DEV__ ?');
    const projectRef = settings.indexOf("t('settings.project')");
    expect(guard).toBeGreaterThan(-1);
    expect(projectRef).toBeGreaterThan(guard);
  });

  it('the routes themselves are sealed, not merely unlinked', () => {
    // The app registers a URL scheme and universal links, so /dev/tokens stays
    // reachable by deep link whether or not anything points at it.
    const layout = source('src/app/dev/_layout.tsx');

    expect(layout).toContain('if (!__DEV__)');
    expect(layout).toContain('Redirect');
  });

  it.each([
    'src/app/dev/tokens.tsx',
    'src/app/dev/components.tsx',
    'src/app/dev/preview.tsx',
    'src/app/dev/share-card.tsx',
  ])('%s sits under that layout', (path) => {
    // If a dev screen is ever moved out of src/app/dev/, it escapes the guard.
    expect(() => source(path)).not.toThrow();
  });
});

/**
 * The website had the same shape of problem as the app, one layer out.
 *
 * `/dev/*` is a styleguide, a share-card harness and the social-card templates.
 * They were kept out of the sitemap and disallowed in robots.txt, which stops
 * them being listed and does nothing to stop them being served — an address
 * anyone can type is a shipped page. The build genuinely needs them, because
 * the Open Graph images are rendered from /dev/human-social/*, so the fix is to
 * strip them afterwards rather than to stop building them.
 */
describe('website developer pages do not ship', () => {
  const websitePackage = JSON.parse(source('website/package.json'));

  it('strips the developer routes from every build that produces a dist', () => {
    for (const script of ['build', 'build:quality']) {
      expect(websitePackage.scripts[script]).toContain(
        'node scripts/strip-dev-pages.mjs'
      );
    }
  });

  it('strips them after the social cards are rendered from them', () => {
    const build = websitePackage.scripts.build;
    expect(build.indexOf('generate-human-social-cards.mjs')).toBeLessThan(
      build.indexOf('strip-dev-pages.mjs')
    );
  });

  it('verifies the removal rather than trusting it', () => {
    const strip = source('website/scripts/strip-dev-pages.mjs');
    expect(strip).toContain('findDevRoutes');
    expect(strip).toContain('process.exit(1)');
  });
});
