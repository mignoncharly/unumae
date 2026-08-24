import {
  ACCEPT_SELECTION_ACTION,
  notificationAction,
  notificationCategory,
  notificationDestination,
  notificationInvitationId,
} from '..';

describe('notification open attribution', () => {
  it('keeps only allowlisted categories and destinations', () => {
    expect(notificationCategory({ category: 'selected' })).toBe('selected');
    expect(notificationDestination({ category: 'selected' })).toBe(
      'invitation'
    );
    expect(notificationCategory({ category: 'marketing' })).toBe('unknown');
    expect(notificationDestination({ category: 'marketing' })).toBe('today');
  });

  it('distinguishes archive fallback from a specific Human', () => {
    expect(notificationDestination({ category: 'answered' })).toBe('archive');
    expect(
      notificationDestination({ category: 'answered', drawId: 'draw-1' })
    ).toBe('human');
  });

  it('extracts only a usable invitation identifier', () => {
    expect(notificationInvitationId({ invitationId: 'invite-1' })).toBe(
      'invite-1'
    );
    expect(notificationInvitationId({ invitationId: 4 })).toBeNull();
  });

  it('normalizes native action identifiers before recording them', () => {
    expect(notificationAction(ACCEPT_SELECTION_ACTION)).toBe('accept');
    expect(
      notificationAction('expo.modules.notifications.actions.DEFAULT')
    ).toBe('default');
    expect(notificationAction('vendor-specific')).toBe('other');
  });
});
