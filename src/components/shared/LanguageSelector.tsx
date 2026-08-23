import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import {
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@/constants/constitution';
import { track } from '@/lib/analytics';
import { usePreferences } from '@/stores/preferences';
import { useTheme } from '@/theme';

const LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
};

/**
 * Article 9.6 — the three MVP languages. Each is named in its own language,
 * never translated into the current one.
 */
export function LanguageSelector() {
  const theme = useTheme();
  const { t } = useTranslation();
  const locale = usePreferences((state) => state.locale);
  const setLocale = usePreferences((state) => state.setLocale);

  const options: { value: SupportedLocale | null; label: string }[] = [
    { value: null, label: t('settings.languageSystem') },
    ...SUPPORTED_LOCALES.map((code) => ({
      value: code,
      label: LABELS[code],
    })),
  ];

  return (
    <View
      style={[
        styles.group,
        {
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      {options.map((option, index) => {
        const selected = locale === option.value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            key={option.value ?? 'system'}
            onPress={() => {
              setLocale(option.value);
              track('language_changed', { locale: option.value ?? 'system' });
            }}
            style={{
              paddingVertical: theme.spacing.lg,
              paddingHorizontal: theme.spacing.lg,
              borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
              borderTopColor: theme.colors.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              minHeight: 44,
            }}
          >
            <Text>{option.label}</Text>
            {selected ? (
              <Feather
                color={theme.colors.accent}
                name="check-circle"
                size={20}
              />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
