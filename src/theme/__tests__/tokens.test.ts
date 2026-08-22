import { colors, motion, radius, spacing, tokens } from '../tokens';

describe('design tokens', () => {
  it('defines the seven token families from Phase 2', () => {
    expect(Object.keys(tokens).sort()).toEqual([
      'breakpoints',
      'colors',
      'motion',
      'radius',
      'shadows',
      'spacing',
      'typography',
    ]);
  });

  it('defines the same colour names in light and dark', () => {
    expect(Object.keys(colors.light).sort()).toEqual(
      Object.keys(colors.dark).sort()
    );
  });

  it('keeps the spacing scale monotonic', () => {
    const values = Object.values(spacing);
    const sorted = [...values].sort((a, b) => a - b);
    expect(values).toEqual(sorted);
  });

  it('keeps radius values non-negative', () => {
    for (const value of Object.values(radius)) {
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  /**
   * Article 11 — animation is discreet. A duration long enough to feel like a
   * slot machine is a design regression, so the ceiling is asserted.
   */
  it('keeps animation short, except the one ceremonial transition', () => {
    const { ceremonial, ...everyday } = motion.durations;
    for (const duration of Object.values(everyday)) {
      expect(duration).toBeLessThanOrEqual(500);
    }
    expect(ceremonial).toBeLessThanOrEqual(1000);
  });
});
