import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  COUNTRY_CODES,
  LANGUAGE_CODES,
  localizedLanguageName,
} from '@/constants/geography';
import { useTheme } from '@/theme';
import { countryName, flagEmoji } from '@/utils/country';

import { Sheet } from '../ui/Sheet';
import { Text } from '../ui/Text';
import { TextField } from '../ui/TextField';

interface FieldChromeProps {
  label: string;
  value: string;
  placeholder: string;
  error?: string | undefined;
  hint?: string | undefined;
  onPress: () => void;
}

function FieldChrome({
  label,
  value,
  placeholder,
  error,
  hint,
  onPress,
}: FieldChromeProps) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text color="textSecondary" variant="footnote" style={styles.label}>
        {label}
      </Text>
      <Pressable
        accessibilityLabel={`${label}: ${value || placeholder}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: error ? theme.colors.danger : theme.colors.border,
          borderRadius: theme.radius.xl,
          borderWidth: error ? 1.5 : StyleSheet.hairlineWidth,
          flexDirection: 'row',
          minHeight: 52,
          opacity: pressed ? 0.7 : 1,
          paddingHorizontal: theme.spacing.lg,
        })}
      >
        <Text color={value ? 'text' : 'textTertiary'} style={{ flex: 1 }}>
          {value || placeholder}
        </Text>
        <Feather
          color={theme.colors.textTertiary}
          name="chevron-down"
          size={19}
        />
      </Pressable>
      <Text color={error ? 'danger' : 'textTertiary'} variant="footnote">
        {error ?? hint ?? ''}
      </Text>
    </View>
  );
}

function ChoiceRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        borderBottomColor: theme.colors.border,
        borderBottomWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        minHeight: 48,
        opacity: pressed ? 0.65 : 1,
        paddingVertical: theme.spacing.sm,
      })}
    >
      <Text style={{ flex: 1 }}>{label}</Text>
      {selected ? (
        <Feather color={theme.colors.accent} name="check" size={19} />
      ) : null}
    </Pressable>
  );
}

export function CountryPicker({
  value,
  onChange,
  label,
  hint,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const options = useMemo(
    () =>
      COUNTRY_CODES.map((code) => ({
        code,
        name: countryName(code, i18n.language),
      }))
        .filter(({ code, name }) =>
          `${code} ${name}`
            .toLocaleLowerCase(i18n.language)
            .includes(search.trim().toLocaleLowerCase(i18n.language))
        )
        .sort((a, b) => a.name.localeCompare(b.name, i18n.language)),
    [i18n.language, search]
  );
  const selected = value
    ? `${flagEmoji(value)} ${countryName(value, i18n.language)}`
    : '';

  return (
    <>
      <FieldChrome
        error={error}
        hint={hint}
        label={label}
        onPress={() => setOpen(true)}
        placeholder={t('profile.countryPlaceholder')}
        value={selected}
      />
      <Sheet
        onClose={() => {
          setOpen(false);
          setSearch('');
        }}
        title={t('profile.countryPlaceholder')}
        visible={open}
      >
        <TextField
          autoCapitalize="words"
          autoCorrect={false}
          label={t('profile.countrySearch')}
          onChangeText={setSearch}
          value={search}
        />
        <View style={{ marginTop: theme.spacing.md }}>
          {options.map((option) => (
            <ChoiceRow
              key={option.code}
              label={`${flagEmoji(option.code)} ${option.name}`}
              onPress={() => {
                onChange(option.code);
                setOpen(false);
                setSearch('');
              }}
              selected={option.code === value}
            />
          ))}
        </View>
      </Sheet>
    </>
  );
}

export function LanguagesPicker({
  value,
  onChange,
  label,
  hint,
  error,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const options = useMemo(
    () =>
      LANGUAGE_CODES.map((code) => ({
        code,
        name: localizedLanguageName(code, i18n.language),
      }))
        .filter(({ code, name }) =>
          `${code} ${name}`
            .toLocaleLowerCase(i18n.language)
            .includes(search.trim().toLocaleLowerCase(i18n.language))
        )
        .sort((a, b) => a.name.localeCompare(b.name, i18n.language)),
    [i18n.language, search]
  );
  const selected = value
    .map((code) => localizedLanguageName(code, i18n.language))
    .join(', ');

  function toggle(code: string) {
    if (value.includes(code)) {
      onChange(value.filter((item) => item !== code));
    } else if (value.length < 10) {
      onChange([...value, code]);
    }
  }

  return (
    <>
      <FieldChrome
        error={error}
        hint={hint}
        label={label}
        onPress={() => setOpen(true)}
        placeholder={t('profile.languagesPlaceholder')}
        value={selected}
      />
      <Sheet
        onClose={() => {
          setOpen(false);
          setSearch('');
        }}
        title={t('profile.languagesPlaceholder')}
        visible={open}
      >
        <TextField
          autoCapitalize="words"
          autoCorrect={false}
          label={t('profile.languagesSearch')}
          onChangeText={setSearch}
          value={search}
        />
        <Text color="textTertiary" variant="footnote">
          {t('profile.languagesSelected', { count: value.length })}
        </Text>
        <View style={{ marginTop: theme.spacing.md }}>
          {options.map((option) => (
            <ChoiceRow
              key={option.code}
              label={option.name}
              onPress={() => toggle(option.code)}
              selected={value.includes(option.code)}
            />
          ))}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: '600' },
});
