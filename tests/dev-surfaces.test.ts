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
