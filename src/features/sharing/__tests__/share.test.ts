import {
  buildShareMessage,
  SHARE_BASE_URL,
  shareUrl,
  type ShareableHuman,
} from '../share';

const AYA: ShareableHuman = {
  humanNumber: 128,
  name: 'Aya',
  countryName: 'Japan',
  flag: '🇯🇵',
  quote: 'People think politeness here means distance. It is the opposite.',
  drawId: '0f8fad5b-d9cb-469f-a165-70867728950e',
  isToday: true,
};

const TAGLINE = '8 billion people. One today.';

describe('the shared message', () => {
  const message = buildShareMessage(AYA, TAGLINE);

  it('says who, where, and what this is', () => {
    // It has to make sense to somebody who has never heard of the product and
    // has installed nothing.
    expect(message).toContain('HUMAN #0128');
    expect(message).toContain('Aya');
    expect(message).toContain('🇯🇵 Japan');
    expect(message).toContain(TAGLINE);
    expect(message).toContain(SHARE_BASE_URL);
  });

  it('quotes them when there is something to quote', () => {
    expect(message).toContain('"People think politeness');
  });

  it('works without a quote', () => {
    const withoutQuote = buildShareMessage({ ...AYA, quote: null }, TAGLINE);
    expect(withoutQuote).toContain('Aya');
    expect(withoutQuote).not.toContain('""');
  });

  it('never mentions a count of anything', () => {
    // Sharing must not turn a person into a metric: no viewers, no Remembers,
    // no votes (Articles 1.2 and 9.4).
    for (const forbidden of [
      'views',
      'viewers',
      'remembers',
      'likes',
      'votes',
      'followers',
      'trending',
    ]) {
      expect(message.toLowerCase()).not.toContain(forbidden);
    }
  });

  it('never claims a ranking', () => {
    expect(message.toLowerCase()).not.toContain('top');
    expect(message.toLowerCase()).not.toContain('best');
    expect(message.toLowerCase()).not.toContain('most');
  });
});

describe('where a shared link lands', () => {
  it('points at today for a live Human', () => {
    expect(shareUrl(AYA)).toBe(`${SHARE_BASE_URL}/today`);
  });

  it('points at the person for an archived one', () => {
    // Today's link has to keep working tomorrow, when today's Human is no
    // longer today's — so an archived share is addressed by identity.
    expect(shareUrl({ ...AYA, isToday: false })).toBe(
      `${SHARE_BASE_URL}/human/${AYA.drawId}`
    );
  });

  it('uses https', () => {
    expect(SHARE_BASE_URL.startsWith('https://')).toBe(true);
  });
});
