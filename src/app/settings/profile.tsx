import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  CountryPicker,
  LanguagesPicker,
} from '@/components/profiles/ProfilePickers';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useMyProfile, useUpdateProfile } from '@/features/profiles/hooks';
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from '@/features/profiles/schema';
import { toAppError } from '@/lib/errors';
import { useTheme } from '@/theme';

export default function ProfileScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: profile, isLoading } = useMyProfile();
  const update = useUpdateProfile();
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      bio_short: profile.bio_short,
      city: profile.city,
      country_code: profile.country_code,
      display_name: profile.display_name,
      languages: profile.languages,
      username: profile.username,
    });
  }, [profile, reset]);

  async function onSubmit(values: UpdateProfileInput) {
    try {
      await update.mutateAsync(values);
      router.back();
    } catch (caught) {
      setError('root', { message: t(toAppError(caught).messageKey) });
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('profile.edit') }} />
      <Screen>
        <PageHeader
          subtitle={t('profile.editSubtitle')}
          title={t('profile.edit')}
        />
        {isLoading ? (
          <View style={{ gap: theme.spacing.lg }}>
            <Skeleton height={52} radius={theme.radius.xl} />
            <Skeleton height={52} radius={theme.radius.xl} />
            <Skeleton height={112} radius={theme.radius.xl} />
          </View>
        ) : profile ? (
          <Surface style={{ gap: theme.spacing.lg }}>
            <Controller
              control={control}
              name="display_name"
              render={({ field }) => (
                <TextField
                  error={errors.display_name?.message}
                  hint={t('profile.displayNameHint')}
                  label={t('profile.displayName')}
                  onChangeText={field.onChange}
                  value={field.value ?? ''}
                />
              )}
            />
            <Controller
              control={control}
              name="username"
              render={({ field }) => (
                <TextField
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={errors.username?.message}
                  label={t('profile.username')}
                  onChangeText={field.onChange}
                  value={field.value ?? ''}
                />
              )}
            />
            <Controller
              control={control}
              name="country_code"
              render={({ field }) => (
                <CountryPicker
                  error={errors.country_code?.message}
                  hint={t('profile.countryHint')}
                  label={t('profile.country')}
                  onChange={field.onChange}
                  value={field.value ?? ''}
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
                  onChangeText={(value) => field.onChange(value || null)}
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
                  onChangeText={(value) => field.onChange(value || null)}
                  value={field.value ?? ''}
                />
              )}
            />
            <Controller
              control={control}
              name="languages"
              render={({ field }) => (
                <LanguagesPicker
                  error={errors.languages?.message}
                  hint={t('profile.languagesHint')}
                  label={t('profile.languages')}
                  onChange={field.onChange}
                  value={field.value ?? []}
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
              icon="check"
              label={t('profile.save')}
              onPress={handleSubmit(onSubmit)}
            />
          </Surface>
        ) : null}
      </Screen>
    </>
  );
}
