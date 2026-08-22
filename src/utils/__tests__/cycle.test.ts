import {
  formatCountdown,
  formatHumanNumber,
  getAcceptanceDeadline,
  getCycleDate,
  getCycleEnd,
  getCycleStart,
  getPoolFreezeAt,
  getQuietDayCutoff,
  getTimeRemaining,
  shiftCycleDate,
} from '../cycle';

/**
 * Article 4 is the rule most likely to be broken by accident, because every
 * developer's machine has a local timezone and none of them is UTC.
 */
describe('cycle date', () => {
  it('uses UTC, not the local timezone', () => {
    // 23:30 UTC on the 21st is still the 21st, even where it is already the 22nd.
    expect(getCycleDate(new Date('2027-03-21T23:30:00.000Z'))).toBe(
      '2027-03-21'
    );
    // 00:30 UTC on the 22nd is the 22nd, even where it is still the 21st.
    expect(getCycleDate(new Date('2027-03-22T00:30:00.000Z'))).toBe(
      '2027-03-22'
    );
  });

  it('does not shift across daylight saving changes', () => {
    // Europe changes clocks on 2027-03-28. The cycle does not.
    expect(getCycleStart('2027-03-28').toISOString()).toBe(
      '2027-03-28T00:00:00.000Z'
    );
    expect(getCycleEnd('2027-03-28').toISOString()).toBe(
      '2027-03-29T00:00:00.000Z'
    );
  });

  it('owns exactly 24 hours, as a half-open interval', () => {
    const start = getCycleStart('2027-01-01').getTime();
    const end = getCycleEnd('2027-01-01').getTime();
    expect(end - start).toBe(24 * 60 * 60 * 1000);
    // The end instant belongs to the next cycle, not this one.
    expect(getCycleDate(getCycleEnd('2027-01-01'))).toBe('2027-01-02');
  });

  it('crosses month and year boundaries', () => {
    expect(shiftCycleDate('2027-01-01', -1)).toBe('2026-12-31');
    expect(shiftCycleDate('2027-02-28', 1)).toBe('2027-03-01');
    // 2028 is a leap year.
    expect(shiftCycleDate('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('rejects a malformed cycle date', () => {
    expect(() => getCycleStart('not-a-date')).toThrow(RangeError);
  });
});

describe('draw schedule', () => {
  it('freezes the pool at D-2 00:00 UTC (Article 5.2)', () => {
    expect(getPoolFreezeAt('2027-03-10').toISOString()).toBe(
      '2027-03-08T00:00:00.000Z'
    );
  });

  it('gives a candidate 12 hours to accept (Article 5.5)', () => {
    expect(
      getAcceptanceDeadline(new Date('2027-03-08T00:10:00.000Z')).toISOString()
    ).toBe('2027-03-08T12:10:00.000Z');
  });

  it('sets the Quiet Day cutoff at 22:00 UTC on D-1 (Article 5.8)', () => {
    expect(getQuietDayCutoff('2027-03-10').toISOString()).toBe(
      '2027-03-09T22:00:00.000Z'
    );
  });
});

describe('countdown', () => {
  it('counts down within the cycle', () => {
    const remaining = getTimeRemaining(
      '2027-03-10',
      new Date('2027-03-10T05:16:48.000Z')
    );
    expect(remaining).toMatchObject({
      hours: 18,
      minutes: 43,
      seconds: 12,
      expired: false,
    });
    expect(formatCountdown(remaining)).toBe('18:43:12');
  });

  it('never goes negative once the cycle is over', () => {
    const remaining = getTimeRemaining(
      '2027-03-10',
      new Date('2027-03-11T04:00:00.000Z')
    );
    expect(remaining.totalMs).toBe(0);
    expect(remaining.expired).toBe(true);
    expect(formatCountdown(remaining)).toBe('00:00:00');
  });

  it('pads every field to two digits', () => {
    const remaining = getTimeRemaining(
      '2027-03-10',
      new Date('2027-03-10T23:59:01.000Z')
    );
    expect(formatCountdown(remaining)).toBe('00:00:59');
  });
});

describe('human number', () => {
  it('formats as HUMAN #0128', () => {
    expect(formatHumanNumber(128)).toBe('HUMAN #0128');
    expect(formatHumanNumber(1)).toBe('HUMAN #0001');
  });

  it('does not truncate once the archive passes four digits', () => {
    expect(formatHumanNumber(10_000)).toBe('HUMAN #10000');
  });
});
