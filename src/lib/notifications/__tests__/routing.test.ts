import { notificationRoute } from '../index';

describe('notification routing', () => {
  it('opens a selection at the invitation', () => {
    expect(notificationRoute({ category: 'selected' })).toBe(
      '/(selection)/invitation'
    );
  });

  it('opens daily and answered notices on Today', () => {
    expect(notificationRoute({ category: 'daily' })).toBe('/(tabs)');
    expect(notificationRoute({ category: 'answered' })).toBe('/(tabs)');
  });

  it('opens anniversaries in the Archive and handles malformed data safely', () => {
    expect(notificationRoute({ category: 'anniversary' })).toBe(
      '/(tabs)/archive'
    );
    expect(notificationRoute(null)).toBe('/(tabs)');
  });
});
