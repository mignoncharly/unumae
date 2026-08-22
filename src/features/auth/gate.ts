/**
 * What actually requires an account.
 *
 * Article 6.1 makes guest viewing a permanent right, so this list is
 * exhaustive and closed. Adding to it is a constitutional amendment, and the
 * test in this folder fails if the list changes without one.
 */
export const ACCOUNT_REQUIRED_ACTIONS = [
  'ask',
  'vote',
  'remember',
  'enter-draw',
] as const;

export type AccountRequiredAction = (typeof ACCOUNT_REQUIRED_ACTIONS)[number];

/**
 * Everything a guest may do. Present as a list rather than as "not the above",
 * so that a new feature has to be classified deliberately.
 */
export const GUEST_ALLOWED_ACTIONS = [
  'view-today',
  'read-portrait',
  'read-questions',
  'read-answers',
  'browse-archive',
  'share',
  'change-language',
  'report',
] as const;

export type GuestAllowedAction = (typeof GUEST_ALLOWED_ACTIONS)[number];

export type Action = AccountRequiredAction | GuestAllowedAction;

export function requiresAccount(action: Action): boolean {
  return (ACCOUNT_REQUIRED_ACTIONS as readonly string[]).includes(action);
}

/**
 * Can this person perform this action right now?
 *
 * Reading is always allowed, including while the session is still restoring —
 * a guest must never see a flash of a sign-in wall on a cold start.
 */
export function canPerform(action: Action, isAuthenticated: boolean): boolean {
  return requiresAccount(action) ? isAuthenticated : true;
}
