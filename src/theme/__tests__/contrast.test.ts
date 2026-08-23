import { CONTRAST, contrastRatio, meetsAA, parseColor } from '../contrast';
import { colors } from '../tokens';

/**
 * The palette, checked rather than admired.
 *
 * A product addressed to eight billion people is readable or it is lying about
 * its ambition (Article 11). Contrast is the part of that which can be proved,
 * so it is proved here — in both themes, on every surface text actually sits
 * on.
 */
describe('contrast maths', () => {
  it('gives 21 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });

  it('gives 1 for a colour against itself', () => {
    expect(contrastRatio('#3A7BD5', '#3A7BD5')).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#0B0B0C', '#F7F7F5')).toBeCloseTo(
      contrastRatio('#F7F7F5', '#0B0B0C'),
      5
    );
  });

  it('reads both notations we use', () => {
    expect(parseColor('#FFFFFF')).toEqual([255, 255, 255]);
    expect(parseColor('rgba(11, 11, 12, 0.5)')).toEqual([11, 11, 12]);
    expect(parseColor('not a colour')).toBeNull();
  });
});

/** Every pairing a screen actually produces. */
const SURFACES = [
  'background',
  'surface',
  'surfaceRaised',
  // The brand tint. Held to the same standard as every other surface, because
  // text sits on it too — the first value chosen put textTertiary at 2.88.
  'accentSurface',
] as const;
const BODY_TEXT = ['text', 'textSecondary'] as const;

describe.each(['light', 'dark'] as const)('%s theme', (scheme) => {
  const palette = colors[scheme];

  describe.each(SURFACES)('on %s', (surface) => {
    it.each(BODY_TEXT)('%s meets AA for body text', (token) => {
      const ratio = contrastRatio(palette[token], palette[surface]);
      expect({ token, surface, passes: ratio >= CONTRAST.bodyAA }).toEqual({
        token,
        surface,
        passes: true,
      });
    });

    it('textTertiary meets AA for large text at least', () => {
      // Used for captions and metadata, never for anything that must be read.
      expect(meetsAA(palette.textTertiary, palette[surface], true)).toBe(true);
    });

    it.each(['danger', 'success'] as const)(
      '%s is readable, since it carries meaning',
      (token) => {
        expect(meetsAA(palette[token], palette[surface], true)).toBe(true);
      }
    );
  });

  it('accent text is readable on the accent', () => {
    // The primary button. If this fails, its label is invisible.
    expect(meetsAA(palette.accentText, palette.accent)).toBe(true);
  });

  it('the border is visible against its surface', () => {
    // Not a text threshold — 1.5 is enough for a hairline to be perceptible
    // without turning every divider into a rule.
    expect(contrastRatio(palette.border, palette.background)).toBeGreaterThan(
      1.15
    );
  });
});
