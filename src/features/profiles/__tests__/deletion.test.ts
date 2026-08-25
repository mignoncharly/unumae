import {
  hasRecentAuthentication,
  isDeletionTerminal,
  isProfilelessAccountRoute,
  RECENT_AUTHENTICATION_MS,
} from '../deletion';

describe('account deletion state', () => {
  const now = Date.parse('2026-08-25T12:00:00.000Z');

  it('requires a sign-in inside the server window', () => {
    expect(
      hasRecentAuthentication(
        new Date(now - RECENT_AUTHENTICATION_MS).toISOString(),
        now
      )
    ).toBe(true);
    expect(
      hasRecentAuthentication(
        new Date(now - RECENT_AUTHENTICATION_MS - 1).toISOString(),
        now
      )
    ).toBe(false);
    expect(hasRecentAuthentication(undefined, now)).toBe(false);
  });

  it('distinguishes completed and support-required terminal states', () => {
    expect(isDeletionTerminal('completed')).toBe(true);
    expect(isDeletionTerminal('manual_review')).toBe(true);
    expect(isDeletionTerminal('retryable_failure')).toBe(false);
  });

  it('allows profileless accounts to reach onboarding or deletion only', () => {
    expect(isProfilelessAccountRoute('/profile')).toBe(true);
    expect(isProfilelessAccountRoute('/settings/account')).toBe(true);
    expect(isProfilelessAccountRoute('/settings/profile')).toBe(false);
    expect(isProfilelessAccountRoute('/today')).toBe(false);
  });
});
