const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockTrack = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  setItem: (...args: unknown[]) => mockSetItem(...args),
}));

jest.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

// Mocks must be initialized before this module captures their implementations.
// eslint-disable-next-line import/first
import { recordActiveDay, resetActiveDayForTests, utcDay } from '../activeDay';

describe('active UTC day analytics', () => {
  beforeEach(() => {
    resetActiveDayForTests();
    mockGetItem.mockReset().mockResolvedValue(null);
    mockSetItem.mockReset().mockResolvedValue(undefined);
    mockTrack.mockReset();
  });

  it('uses UTC rather than the device calendar day', () => {
    expect(utcDay(new Date('2026-08-24T23:59:59-07:00'))).toBe('2026-08-25');
  });

  it('records only once when foregrounded repeatedly on one day', async () => {
    const date = new Date('2026-08-24T12:00:00Z');

    await expect(recordActiveDay(date)).resolves.toBe(true);
    await expect(recordActiveDay(date)).resolves.toBe(false);

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('active_day');
  });

  it('does not record a day already persisted by an earlier process', async () => {
    mockGetItem.mockResolvedValue('2026-08-24');

    await expect(
      recordActiveDay(new Date('2026-08-24T22:00:00Z'))
    ).resolves.toBe(false);
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('records the next UTC day after a resumed process crosses midnight', async () => {
    await recordActiveDay(new Date('2026-08-24T23:59:00Z'));
    mockGetItem.mockResolvedValue('2026-08-24');

    await expect(
      recordActiveDay(new Date('2026-08-25T00:01:00Z'))
    ).resolves.toBe(true);
    expect(mockTrack).toHaveBeenCalledTimes(2);
  });
});
