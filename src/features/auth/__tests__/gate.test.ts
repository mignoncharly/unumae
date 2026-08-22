import {
  ACCOUNT_REQUIRED_ACTIONS,
  GUEST_ALLOWED_ACTIONS,
  canPerform,
  requiresAccount,
  type Action,
} from '../gate';

/**
 * Article 6.1 — guest viewing is a permanent right, not a growth experiment.
 *
 * These tests are the mechanism that keeps it one. If a future phase decides
 * that reading a portrait should require an account, it fails here first.
 */
describe('what requires an account', () => {
  it('is exactly four things, and no more', () => {
    expect([...ACCOUNT_REQUIRED_ACTIONS]).toEqual([
      'ask',
      'vote',
      'remember',
      'enter-draw',
    ]);
  });

  it.each(ACCOUNT_REQUIRED_ACTIONS)('%s requires an account', (action) => {
    expect(requiresAccount(action)).toBe(true);
    expect(canPerform(action, false)).toBe(false);
    expect(canPerform(action, true)).toBe(true);
  });
});

describe('what a guest may always do', () => {
  it.each(GUEST_ALLOWED_ACTIONS)('%s never requires an account', (action) => {
    expect(requiresAccount(action)).toBe(false);
    expect(canPerform(action, false)).toBe(true);
  });

  it('lets a guest read every part of a story', () => {
    const reading: Action[] = [
      'view-today',
      'read-portrait',
      'read-questions',
      'read-answers',
      'browse-archive',
    ];

    for (const action of reading) {
      expect(canPerform(action, false)).toBe(true);
    }
  });

  it('lets a guest share, which is how the product spreads', () => {
    expect(canPerform('share', false)).toBe(true);
  });

  it('lets a guest report, because safety is not a paid feature', () => {
    expect(canPerform('report', false)).toBe(true);
  });

  it('never classifies an action as both', () => {
    const required = new Set<string>(ACCOUNT_REQUIRED_ACTIONS);
    for (const action of GUEST_ALLOWED_ACTIONS) {
      expect(required.has(action)).toBe(false);
    }
  });
});
