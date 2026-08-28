import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

describe('Phase 15 growth readiness', () => {
  it('keeps growth closed until the mature beta gate opens', () => {
    const handoff = read('docs/PHASE_15_GROWTH_READINESS.md');
    expect(handoff).toContain('only after the Phase G');
    expect(handoff).toContain('Immature cohorts remain `null`');
    expect(handoff).toContain('At least 25%');
    expect(handoff).toContain('At least 10%');
    expect(handoff).toContain('At least 15%');
    expect(handoff).toContain('At least 3%');
  });

  it('preserves the single organic sharing mechanism and stop conditions', () => {
    const handoff = read('docs/PHASE_15_GROWTH_READINESS.md');
    expect(handoff).toContain('only growth mechanism');
    expect(handoff).toContain('real approved Human');
    expect(handoff).toContain('Stop conditions');
    expect(handoff).toContain('share_sheet_opened');
  });
});
