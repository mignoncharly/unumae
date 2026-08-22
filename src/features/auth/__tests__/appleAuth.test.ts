import { Platform } from 'react-native';

import de from '@/i18n/locales/de.json';
import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';

import {
  appleUnavailableReason,
  isAppleAuthAvailable,
  resetAppleModuleCache,
} from '../appleAuth';

/**
 * Development happens in Expo Go on Android today, and Sign in with Apple
 * cannot work there. These tests exist so that stays a graceful absence rather
 * than a crash on a screen a guest can reach.
 */
describe('Apple sign-in availability', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS });
    resetAppleModuleCache();
  });

  it('is unavailable on Android, without throwing', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    resetAppleModuleCache();

    await expect(isAppleAuthAvailable()).resolves.toBe(false);
    expect(appleUnavailableReason()).toBe('not-ios');
  });

  it('is unavailable on web, without throwing', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    resetAppleModuleCache();

    await expect(isAppleAuthAvailable()).resolves.toBe(false);
    expect(appleUnavailableReason()).toBe('not-ios');
  });

  it('never rejects, whatever the platform', async () => {
    // A guest reaching the sign-in screen must never see a crash because a
    // native module is missing.
    for (const os of ['ios', 'android', 'web'] as const) {
      Object.defineProperty(Platform, 'OS', { value: os });
      resetAppleModuleCache();
      await expect(isAppleAuthAvailable()).resolves.not.toThrow();
    }
  });

  it('gives a reason rather than silently hiding', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    resetAppleModuleCache();
    expect(appleUnavailableReason()).not.toBeNull();
  });
});

describe('what the user is told when Apple is unavailable', () => {
  const locales = { en, fr, de } as const;

  it.each(Object.entries(locales))(
    '%s explains that a development build is needed',
    (_locale, translation) => {
      expect(translation.auth.appleNeedsBuild.length).toBeGreaterThan(30);
      expect(translation.auth.appleUnavailable.length).toBeGreaterThan(10);
    }
  );

  it.each(Object.entries(locales))(
    '%s still offers the email path, which works everywhere',
    (_locale, translation) => {
      expect(translation.auth.sendCode).toBeTruthy();
      expect(translation.auth.emailLabel).toBeTruthy();
    }
  );
});
