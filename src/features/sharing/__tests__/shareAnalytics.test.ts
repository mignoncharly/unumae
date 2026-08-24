const mockTrack = jest.fn();

jest.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

// The analytics mock must exist before share.ts captures it.
// eslint-disable-next-line import/first
import { Share } from 'react-native';

// eslint-disable-next-line import/first
import { shareHuman, type ShareableHuman } from '../share';

const HUMAN: ShareableHuman = {
  humanNumber: 12,
  name: 'Aya',
  countryName: 'Japan',
  flag: '🇯🇵',
  drawId: 'draw-12',
  isToday: true,
};

describe('share measurement', () => {
  const share = jest.spyOn(Share, 'share');

  beforeEach(() => {
    share.mockReset();
    mockTrack.mockReset();
  });

  it('records an opened sheet without claiming recipient completion', async () => {
    share.mockResolvedValue({ action: Share.dismissedAction });

    await expect(shareHuman(HUMAN, 'One today.')).resolves.toBe(false);
    expect(mockTrack).toHaveBeenCalledWith('share_sheet_opened', {
      today: true,
      card: false,
    });
    expect(mockTrack).not.toHaveBeenCalledWith(
      'share_completed',
      expect.anything()
    );
  });

  it('does not record a sheet when the native API fails to open it', async () => {
    share.mockRejectedValue(new Error('unavailable'));

    await expect(shareHuman(HUMAN, 'One today.')).resolves.toBe(false);
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
