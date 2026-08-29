import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

describe('Phase 16 scale and deferred-feature guardrails', () => {
  it('keeps deferred features closed', () => {
    const handoff = read('docs/PHASE_16_SCALE_READINESS.md');
    expect(handoff).toContain('design-only and closed');
    expect(handoff).toMatch(/never a\s+personality or ghostwriter/);
    expect(handoff).toContain('Explicitly still deferred');
  });

  it('preserves the archive and no-popularity constraints', () => {
    const handoff = read('docs/PHASE_16_SCALE_READINESS.md');
    const constitution = read('docs/PRODUCT_CONSTITUTION.md');
    expect(handoff).toContain('fresh consent');
    expect(handoff).toContain('five years');
    expect(handoff).toContain('no view score');
    expect(constitution).toContain('A permanent archive.');
    expect(constitution).toContain('No popularity contest.');
  });
});
