import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  CANONICAL_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@/constants/constitution';

import de from './locales/de.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

/**
 * Article 9.6 — English is canonical. French and German ship at MVP.
 * No UI text is ever hardcoded in a component.
 */
export const resources = {
  en: { translation: en },
  fr: { translation: fr },
  de: { translation: de },
} as const;

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** The device language, if we speak it. Otherwise the canonical language. */
export function resolveDeviceLocale(): SupportedLocale {
  for (const locale of getLocales()) {
    const code = locale.languageCode ?? '';
    if (isSupportedLocale(code)) {
      return code;
    }
  }
  return CANONICAL_LOCALE;
}

let initialised = false;

export function initI18n(locale?: SupportedLocale) {
  if (initialised) {
    return i18n;
  }

  // i18next's default export carries `.use`; this is the documented API, not
  // an accidental named-export access.
  // eslint-disable-next-line import/no-named-as-default-member
  void i18n.use(initReactI18next).init({
    resources,
    lng: locale ?? resolveDeviceLocale(),
    fallbackLng: CANONICAL_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  initialised = true;
  return i18n;
}

export default i18n;
