import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

describe('Phase G launch readiness handoff', () => {
  it('keeps the four precommitted growth thresholds visible', () => {
    const handoff = read('docs/PHASE_G_LAUNCH_READINESS.md');
    expect(handoff).toContain('D1 retention | 25%');
    expect(handoff).toContain('D7 retention | 10%');
    expect(handoff).toContain('Participation | 15%');
    expect(handoff).toContain('Share rate | 3%');
  });

  it('requires exact-build traceability and aggregate-only beta evidence', () => {
    const handoff = read('docs/PHASE_G_LAUNCH_READINESS.md');
    expect(handoff).toContain('App commit SHA');
    expect(handoff).toContain('Hosted backend SHA');
    expect(handoff).toContain('aggregate counts');
    expect(handoff).toContain('Never fabricate a Human');
  });
});
