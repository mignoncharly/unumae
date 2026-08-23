import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BrandHero } from '@/components/ui/BrandHero';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useCreateProfile } from '@/features/profiles/hooks';
import {
  createProfileSchema,
  type CreateProfileInput,
} from '@/features/profiles/schema';
import { toAppError } from '@/lib/errors';
import { useTheme } from '@/theme';

/**
 * The profile is deliberately minimal (Article 6.2). Four required fields, two
 * optional ones, and nothing that could ever be ranked.
 *
 * The city field is optional and stays optional. Precise location must never
 * become required (Article 8.2) — country is sufficient.
 */
export default function OnboardingProfileScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const createProfile = useCreateProfile();
  const [step, setStep] = useState(1);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateProfileInput>({
    resolver: zodResolver(createProfileSchema),
    defaultValues: {
      username: '',
      display_name: '',
      country_code: '',
      languages: [],
    },
  });

  async function onSubmit(values: CreateProfileInput) {
    try {
      await createProfile.mutateAsync(values);
      router.replace('/');
    } catch (caught) {
      const appError = toAppError(caught);
      setError(
        appError.messageKey === 'profile.usernameTaken' ? 'username' : 'root',
        { message: t(appError.messageKey) }
      );
    }
  }

  if (step < 3) {
    const first = step === 1;
    return (
      <Screen
        scroll={false}
        contentContainerStyle={{ justifyContent: 'center' }}
      >
        <BrandHero
          body={t(first ? 'onboarding.ideaBody' : 'onboarding.philosophyBody')}
          step={t('onboarding.step', { current: step, total: 3 })}
          title={t(
            first ? 'onboarding.ideaTitle' : 'onboarding.philosophyTitle'
          )}
        />
        <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
          <Button
            icon={first ? 'globe' : 'heart'}
            label={t('onboarding.continue')}
            onPress={() => setStep((current) => current + 1)}
          />
          {step === 2 ? (
            <Button
              label={t('common.back')}
              onPress={() => setStep(1)}
              variant="ghost"
            />
          ) : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <BrandHero
        body={t('onboarding.profileBody')}
        step={t('onboarding.step', { current: 3, total: 3 })}
        title={t('onboarding.profileTitle')}
      />

      <Surface style={{ marginTop: theme.spacing.xl, gap: theme.spacing.lg }}>
        <Controller
          control={control}
          name="username"
          render={({ field }) => (
            <TextField
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.username?.message}
              hint={t('profile.usernameHint')}
              label={t('profile.username')}
              onChangeText={field.onChange}
              value={field.value}
            />
          )}
        />

        <Controller
          control={control}
          name="display_name"
          render={({ field }) => (
            <TextField
              error={errors.display_name?.message}
              hint={t('profile.displayNameHint')}
              label={t('profile.displayName')}
              onChangeText={field.onChange}
              value={field.value}
            />
          )}
        />

        <Controller
          control={control}
          name="birth_year"
          render={({ field }) => (
            <TextField
              error={errors.birth_year?.message}
              hint={t('profile.birthYearHint')}
              inputMode="numeric"
              keyboardType="number-pad"
              label={t('profile.birthYear')}
              maxLength={4}
              onChangeText={(text) =>
                field.onChange(text ? Number(text) : undefined)
              }
              value={field.value ? String(field.value) : ''}
            />
          )}
        />

        <Controller
          control={control}
          name="country_code"
          render={({ field }) => (
            <TextField
              autoCapitalize="characters"
              autoCorrect={false}
              error={errors.country_code?.message}
              hint={t('profile.countryHint')}
              label={t('profile.country')}
              maxLength={2}
              onChangeText={field.onChange}
              value={field.value}
            />
          )}
        />

        <Controller
          control={control}
          name="city"
          render={({ field }) => (
            <TextField
              error={errors.city?.message}
              hint={t('profile.cityHint')}
              label={t('profile.city')}
              onChangeText={(text) => field.onChange(text || null)}
              value={field.value ?? ''}
            />
          )}
        />

        <Controller
          control={control}
          name="bio_short"
          render={({ field }) => (
            <TextField
              error={errors.bio_short?.message}
              hint={t('profile.bioHint')}
              label={t('profile.bio')}
              maxLength={160}
              multiline
              onChangeText={(text) => field.onChange(text || null)}
              value={field.value ?? ''}
            />
          )}
        />

        {errors.root ? (
          <Text color="danger" variant="footnote">
            {errors.root.message}
          </Text>
        ) : null}

        <Button
          disabled={isSubmitting}
          label={t('profile.save')}
          onPress={handleSubmit(onSubmit)}
        />

        <Text color="textTertiary" variant="footnote">
          {t('profile.privacyNote')}
        </Text>
      </Surface>
    </Screen>
  );
}
