import * as ImagePicker from 'expo-image-picker';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { Toast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/useSession';
import {
  getMyPortrait,
  saveAnswer,
  startMyPortrait,
  submitMyPortrait,
  uploadPortraitPhoto,
} from '@/features/portraits/api';
import { prepareForUpload } from '@/features/portraits/image';
import {
  assessCompleteness,
  PORTRAIT_PROMPTS,
  type PortraitElementKey,
} from '@/features/portraits/prompts';
import { track } from '@/lib/analytics';
import { toAppError } from '@/lib/errors';
import { useTheme } from '@/theme';

/**
 * The Human Portrait Builder.
 *
 * Every prompt is optional individually; five of the seven are required
 * together. Nothing here counts down, scores the answers, or suggests what a
 * good one looks like — the guidance is in the questions, not in a critique of
 * the replies.
 */
export default function PortraitScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const session = useSession();
  const userId = session.session?.user.id;

  const [portraitId, setPortraitId] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [answers, setAnswers] = useState<
    Partial<Record<PortraitElementKey, string>>
  >({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const existing = await getMyPortrait();
        if (existing) {
          if (!active) return;
          setPortraitId(existing.portrait.id);
          setAnswers(existing.answers);
          setHasPhoto(existing.portrait.photo_path !== null);
        } else {
          const created = await startMyPortrait();
          if (!active) return;
          setPortraitId(created);
        }
      } catch (caught) {
        if (active) setError(t(toAppError(caught).messageKey));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [t]);

  const completeness = assessCompleteness(answers, hasPhoto);

  async function handlePickPhoto() {
    if (!portraitId || !userId) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t('portrait.photoPermission'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });

    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;

    setBusy(true);
    setError(undefined);
    try {
      // Downscaled first: a 10MB camera original is the difference between a
      // portrait being submitted and abandoned on a weak connection.
      const prepared = await prepareForUpload(
        asset.uri,
        asset.width,
        asset.height
      );
      await uploadPortraitPhoto(userId, portraitId, prepared.uri);
      setPhotoUri(prepared.uri);
      setHasPhoto(true);
      setToast(t('portrait.photoSaved'));
    } catch (caught) {
      setError(t(toAppError(caught).messageKey));
    } finally {
      setBusy(false);
    }
  }

  async function handleBlur(key: PortraitElementKey) {
    if (!portraitId) return;
    try {
      await saveAnswer(portraitId, key, answers[key] ?? '');
    } catch (caught) {
      setError(t(toAppError(caught).messageKey));
    }
  }

  async function handleSubmit() {
    setBusy(true);
    setError(undefined);
    try {
      await submitMyPortrait();
      track('portrait_completed');
      router.replace('/');
    } catch (caught) {
      setError(t(toAppError(caught).messageKey));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <Text color="textSecondary">{t('common.loading')}</Text>
      </Screen>
    );
  }

  if (!portraitId) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: '' }} />
        <Screen>
          <EmptyState
            body={t('portrait.notSelectedBody')}
            title={t('portrait.notSelected')}
          />
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t('portrait.title') }}
      />
      <Screen>
        <Text variant="title2">{t('portrait.heading')}</Text>
        <Text color="textSecondary" style={{ marginTop: theme.spacing.md }}>
          {t('portrait.intro')}
        </Text>

        {/* Photo first: it is the only required element that is not a prompt. */}
        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
          <Text color="textTertiary" variant="footnote">
            {t('portrait.photo').toUpperCase()}
          </Text>

          {photoUri || hasPhoto ? (
            <Image
              accessibilityIgnoresInvertColors
              accessibilityLabel={t('portrait.photo')}
              source={{ uri: photoUri ?? '' }}
              style={{
                width: '100%',
                aspectRatio: 4 / 5,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.surface,
              }}
            />
          ) : null}

          <Button
            disabled={busy}
            label={
              hasPhoto ? t('portrait.photoChange') : t('portrait.photoAdd')
            }
            onPress={handlePickPhoto}
            variant="secondary"
          />
          <Text color="textTertiary" variant="footnote">
            {t('portrait.photoHint')}
          </Text>
        </View>

        <View style={{ marginTop: theme.spacing.xxxl, gap: theme.spacing.xxl }}>
          {PORTRAIT_PROMPTS.map((prompt) => (
            <TextField
              hint={t(prompt.hintKey)}
              key={prompt.key}
              label={t(prompt.labelKey)}
              maxLength={prompt.maxLength}
              multiline
              onBlur={() => void handleBlur(prompt.key)}
              onChangeText={(text) =>
                setAnswers((previous) => ({ ...previous, [prompt.key]: text }))
              }
              value={answers[prompt.key] ?? ''}
            />
          ))}
        </View>

        <View style={{ marginTop: theme.spacing.xxxl, gap: theme.spacing.md }}>
          <Text color="textSecondary">
            {completeness.canSubmit
              ? t('portrait.readyToSubmit')
              : t('portrait.stillNeeded', {
                  count: completeness.remaining,
                  photo: completeness.hasPhoto
                    ? ''
                    : t('portrait.andAPhotograph'),
                })}
          </Text>

          <Button
            disabled={!completeness.canSubmit || busy}
            label={t('portrait.submit')}
            onPress={handleSubmit}
          />

          <Text color="textTertiary" variant="footnote">
            {t('portrait.submitNote')}
          </Text>

          {error ? (
            <Text color="danger" variant="footnote">
              {error}
            </Text>
          ) : null}
        </View>
      </Screen>

      <Toast
        message={toast ?? ''}
        onDismiss={() => setToast(null)}
        tone="success"
        visible={toast !== null}
      />
    </>
  );
}
