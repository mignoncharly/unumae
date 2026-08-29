import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

describe('Phase F App Store release pack', () => {
  const metadata = JSON.parse(read('docs/app-store-metadata.json')) as {
    name: string;
    localizations: Record<
      string,
      {
        subtitle: string;
        promotionalText: string;
        description: string;
        keywords: string;
        whatsNew: string;
      }
    >;
  };

  it('has exact EN/FR/DE fields within App Store limits', () => {
    expect(metadata.name).toBe('Unumae');
    expect(Object.keys(metadata.localizations)).toEqual([
      'en-US',
      'fr-FR',
      'de-DE',
    ]);
    for (const fields of Object.values(metadata.localizations)) {
      expect(fields.subtitle.length).toBeLessThanOrEqual(30);
      expect(fields.promotionalText.length).toBeLessThanOrEqual(170);
      expect(fields.description.length).toBeLessThanOrEqual(4000);
      expect(fields.keywords.length).toBeLessThanOrEqual(100);
      expect(fields.whatsNew.length).toBeLessThanOrEqual(4000);
    }
  });

  it('keeps the review path factual and guest-first', () => {
    const notes = read('docs/APP_REVIEW_NOTES.md');
    expect(notes).toContain('fully usable as a guest');
    expect(notes).toContain('Settings -> Delete my account');
    expect(notes).toContain('not a sweepstake or contest');
    expect(notes).toContain('different moderator');
  });
});
