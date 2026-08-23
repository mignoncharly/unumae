import { notificationRoute } from '../index';

describe('notification routing', () => {
  it('opens a selection at the invitation', () => {
    expect(notificationRoute({ category: 'selected' })).toBe(
      '/(selection)/invitation'
    );
  });

  it('opens daily notices on Today and an answered Human directly', () => {
    expect(notificationRoute({ category: 'daily' })).toBe('/(tabs)');
    expect(
      notificationRoute({ category: 'answered', drawId: 'draw-answer' })
    ).toEqual({ pathname: '/human/[id]', params: { id: 'draw-answer' } });
  });

  it('opens an anniversary Human directly and handles malformed data safely', () => {
    expect(
      notificationRoute({ category: 'anniversary', drawId: 'draw-year-ago' })
    ).toEqual({ pathname: '/human/[id]', params: { id: 'draw-year-ago' } });
    expect(notificationRoute({ category: 'anniversary' })).toBe(
      '/(tabs)/archive'
    );
    expect(notificationRoute(null)).toBe('/(tabs)');
  });
});
