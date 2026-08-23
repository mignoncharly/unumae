import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { SupportedLocale } from '@/constants/constitution';
import i18n from '@/i18n';

/**
 * Zustand is used only for state that is genuinely global and local to the
 * device. Server state belongs to TanStack Query, not here.
 */
interface PreferencesState {
  /** null means "follow the system language". */
  locale: SupportedLocale | null;
  setLocale: (locale: SupportedLocale | null) => void;
  /** Theme override. System keeps the app native to the device setting. */
  appearance: 'system' | 'light' | 'dark';
  setAppearance: (appearance: 'system' | 'light' | 'dark') => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      locale: null,
      appearance: 'system',
      setLocale: (locale) => {
        set({ locale });
        if (locale) {
          void i18n.changeLanguage(locale);
        }
      },
      setAppearance: (appearance) => set({ appearance }),
    }),
    {
      name: 'onehuman.preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
