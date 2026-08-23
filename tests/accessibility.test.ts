import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..', 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return entry === '__tests__' ? [] : walk(full);
    }
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

const FILES = walk(SRC).map((path) => ({
  path: path.replace(SRC, 'src').replace(/\\/g, '/'),
  source: readFileSync(path, 'utf8'),
}));

const COMPONENTS = FILES.filter((file) => file.path.endsWith('.tsx'));

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

/**
 * Article 11 — accessibility is not optional. A product addressed to eight
 * billion people is accessible or it is lying about its ambition.
 *
 * These check the things that can be checked from the source. They do not
 * replace testing with VoiceOver on a device, and they are not meant to.
 */
describe('text scales with the system setting', () => {
  /**
   * The share card is the single exemption, and it is narrow on purpose.
   *
   * It is never on screen: it is rendered off-screen at a fixed 1080×1350 and
   * captured to a PNG. Nothing reads it with a screen reader, nothing sees it
   * at a larger size, and letting Dynamic Type apply would push text out of the
   * exported image on exactly the devices whose owners set a larger size.
   *
   * Named as a path rather than allowed by a comment, so adding a second one is
   * a deliberate edit to this list with a reason next to it.
   */
  const FIXED_SIZE_EXPORTS = ['src/components/sharing/ShareCard.tsx'];

  it('never switches font scaling off', () => {
    // The one line that would silently break Dynamic Type everywhere it is
    // used. Bounding the scale is fine; refusing it is not.
    const offenders = COMPONENTS.filter(
      (file) =>
        withoutComments(file.source).includes('allowFontScaling={false}') &&
        !FIXED_SIZE_EXPORTS.includes(file.path)
    ).map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it('exempts only files that really are fixed-size exports', () => {
    // The exemption cannot be used to quietly cover an on-screen component.
    for (const path of FIXED_SIZE_EXPORTS) {
      const file = COMPONENTS.find((candidate) => candidate.path === path);
      expect({ path, found: file !== undefined }).toEqual({
        path,
        found: true,
      });
      expect(file?.source).toContain('SHARE_CARD_WIDTH');
    }
  });

  it('bounds the scale in one place, on the shared Text component', () => {
    const text = FILES.find(
      (file) => file.path === 'src/components/ui/Text.tsx'
    );
    expect(text?.source).toContain('maxFontSizeMultiplier');
    expect(text?.source).toContain('MAX_SCALE');
  });

  it('lets every variant grow by at least half again', () => {
    const text =
      FILES.find((file) => file.path === 'src/components/ui/Text.tsx')
        ?.source ?? '';
    const scales = [...text.matchAll(/^\s+\w+: (\d\.\d),$/gm)].map((match) =>
      Number(match[1])
    );

    expect(scales.length).toBeGreaterThanOrEqual(9);
    for (const scale of scales) {
      expect(scale).toBeGreaterThanOrEqual(1.5);
    }
  });

  it('marks titles as headings so a reader can jump between them', () => {
    const text =
      FILES.find((file) => file.path === 'src/components/ui/Text.tsx')
        ?.source ?? '';
    expect(text).toContain(
      "accessibilityRole={HEADING_VARIANTS.has(variant) ? 'header'"
    );
  });
});

describe('touch targets are reachable', () => {
  it('gives every interactive component a 44pt minimum', () => {
    // Anything a finger has to find. 44pt is Apple's minimum and a reasonable
    // floor for everyone else.
    const interactive = [
      'src/components/ui/Button.tsx',
      'src/components/ui/TextField.tsx',
      'src/components/shared/LanguageSelector.tsx',
      'src/components/shared/ReportAction.tsx',
      'src/components/shared/ExternalLink.tsx',
      'src/components/questions/QuestionCard.tsx',
    ];

    for (const path of interactive) {
      const file = FILES.find((entry) => entry.path === path);
      expect({ path, has: file?.source.includes('44') ?? false }).toEqual({
        path,
        has: true,
      });
    }
  });
});

describe('motion respects the system preference', () => {
  it('is consulted by everything that animates', () => {
    const animating = COMPONENTS.filter((file) =>
      withoutComments(file.source).includes('Animated.')
    );

    expect(animating.length).toBeGreaterThan(0);

    const missing = animating
      .filter((file) => !file.source.includes('useReducedMotion'))
      .map((file) => file.path);

    expect(missing).toEqual([]);
  });
});

describe('images say what they are', () => {
  it('gives every image an alt or an explicit empty one', () => {
    // An empty alt is a decision — "this adds nothing a screen reader needs" —
    // and is different from having forgotten.
    const withImages = COMPONENTS.filter((file) =>
      withoutComments(file.source).includes('<Image')
    );

    expect(withImages.length).toBeGreaterThan(0);

    const missing = withImages
      .filter(
        (file) =>
          !file.source.includes('alt=') &&
          !file.source.includes('accessibilityLabel')
      )
      .map((file) => file.path);

    expect(missing).toEqual([]);
  });

  it('caches to disk, so a reread costs nothing on a poor connection', () => {
    const remote = COMPONENTS.filter((file) =>
      file.source.includes("from 'expo-image'")
    );

    expect(remote.length).toBeGreaterThanOrEqual(3);
    for (const file of remote) {
      expect({
        path: file.path,
        cached: file.source.includes('cachePolicy'),
      }).toEqual({ path: file.path, cached: true });
    }
  });
});

describe('haptics stay discreet', () => {
  it('offers one kind of feedback and no more', () => {
    const haptics =
      FILES.find((file) => file.path === 'src/lib/haptics.ts')?.source ?? '';

    expect(haptics).toContain('ImpactFeedbackStyle.Light');
    // No celebration, no error buzz: a vibration that rewards would make
    // Remember a score (Article 9.4).
    expect(haptics).not.toContain('NotificationFeedbackType');
    expect(haptics).not.toContain('Heavy');
  });

  it('can be switched off', () => {
    const haptics =
      FILES.find((file) => file.path === 'src/lib/haptics.ts')?.source ?? '';
    expect(haptics).toContain('setHapticsEnabled');
  });
});
