/**
 * WCAG contrast maths.
 *
 * Article 11 says accessibility is not optional, and contrast is the one part
 * of it that can be proved rather than reviewed. These functions exist so the
 * palette is checked by a test instead of by eye — a colour that looks fine on
 * a laptop in a dark room can be unreadable outdoors.
 */

/** `#RRGGBB` or `rgba(r, g, b, a)`. Alpha is ignored: contrast needs a solid. */
export function parseColor(color: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (hex) {
    const value = Number.parseInt(hex[1]!, 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }

  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(color.trim());
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }

  return null;
}

function channelLuminance(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928
    ? scaled / 12.92
    : Math.pow((scaled + 0.055) / 1.055, 2.4);
}

/** Relative luminance, per WCAG 2.1. */
export function relativeLuminance(color: string): number {
  const parsed = parseColor(color);
  if (!parsed) {
    return 0;
  }

  const [red, green, blue] = parsed;
  return (
    0.2126 * channelLuminance(red) +
    0.7152 * channelLuminance(green) +
    0.0722 * channelLuminance(blue)
  );
}

/** Contrast ratio between two colours, from 1 (identical) to 21 (black on white). */
export function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background)
  );
  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background)
  );

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG thresholds.
 *
 * AA is the bar this product holds itself to for body text. Large text gets a
 * lower one because it is genuinely easier to read, not as an excuse.
 */
export const CONTRAST = {
  bodyAA: 4.5,
  largeAA: 3,
  bodyAAA: 7,
} as const;

export function meetsAA(
  foreground: string,
  background: string,
  large = false
): boolean {
  return (
    contrastRatio(foreground, background) >=
    (large ? CONTRAST.largeAA : CONTRAST.bodyAA)
  );
}
