import { isRestrictedAccountStatus, isRestrictedRoute } from '../accountState';

describe('account-state client gate', () => {
  it('allows only active accounts to participate', () => {
    expect(isRestrictedAccountStatus('active')).toBe(false);
    expect(isRestrictedAccountStatus('suspended')).toBe(true);
    expect(isRestrictedAccountStatus('banned')).toBe(true);
    expect(isRestrictedAccountStatus('deletion_pending')).toBe(true);
    expect(isRestrictedAccountStatus('deleted')).toBe(true);
  });

  it.each([
    ['settings', 'restricted'],
    ['settings', 'appeals'],
    ['settings', 'account'],
  ])('keeps the restricted support route %s/%s available', (...segments) => {
    expect(isRestrictedRoute(segments)).toBe(true);
  });

  it.each([
    ['(tabs)', 'index'],
    ['settings', 'profile'],
    ['settings', 'privacy'],
    ['(selection)', 'invitation'],
  ])('rejects participation route %s/%s', (...segments) => {
    expect(isRestrictedRoute(segments)).toBe(false);
  });
});
