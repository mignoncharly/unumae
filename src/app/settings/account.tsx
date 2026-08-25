import { useQueryClient } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useSession } from '@/features/auth/useSession';
import {
  deleteMyAccount,
  finishDeletedAccountSession,
  getMyDeletionRequest,
  sendDeletionReauthenticationCode,
  verifyDeletionReauthenticationCode,
} from '@/features/profiles/api';
import {
  hasRecentAuthentication,
  isDeletionTerminal,
} from '@/features/profiles/deletion';
import { toAppError } from '@/lib/errors';
import type { DeletionRequestState } from '@/lib/supabase/types';
import { useTheme } from '@/theme';

export default function AccountScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const session = useSession();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [state, setState] = useState<DeletionRequestState>();
  const [correlationId, setCorrelationId] = useState<string>();
  const [requestStarted, setRequestStarted] = useState(false);
  const [error, setError] = useState<string>();

  const user = session.session?.user;

  useEffect(() => {
    if (!requestStarted || (state && isDeletionTerminal(state))) return;

    let active = true;
    async function refresh() {
      try {
        const request = await getMyDeletionRequest();
        if (!active) return;
        if (!request) {
          // Completion anonymizes user_id, so the caller-scoped row disappears.
          setState('completed');
          return;
        }
        setState(request.state);
        setCorrelationId(request.correlation_id);
      } catch {
        // A transient poll failure must not replace a durable server operation.
      }
    }

    void refresh();
    const timer = setInterval(() => void refresh(), 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [requestStarted, state]);

  async function startDeletion() {
    const accepted = await deleteMyAccount();
    setState(accepted.state);
    setCorrelationId(accepted.correlationId);
    setRequestStarted(true);
  }

  async function handleDelete() {
    setBusy(true);
    setError(undefined);
    try {
      if (!hasRecentAuthentication(user?.last_sign_in_at)) {
        if (!user?.email) {
          throw new Error('Account has no email for reauthentication');
        }
        await sendDeletionReauthenticationCode(user.email);
        setCodeSent(true);
        return;
      }
      await startDeletion();
    } catch (caught) {
      setError(t(toAppError(caught).messageKey));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyAndDelete() {
    if (!user?.email || code.trim().length !== 6) return;
    setBusy(true);
    setError(undefined);
    try {
      await verifyDeletionReauthenticationCode(user.email, code.trim());
      await startDeletion();
    } catch (caught) {
      setError(t(toAppError(caught).messageKey));
    } finally {
      setBusy(false);
    }
  }

  async function handleFinish() {
    setBusy(true);
    try {
      queryClient.clear();
      await finishDeletedAccountSession();
      router.replace('/');
    } catch (caught) {
      setError(t(toAppError(caught).messageKey));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t('settings.deleteAccount') }}
      />
      <Screen>
        <PageHeader
          subtitle={t('settings.deleteExplain')}
          title={t('settings.deleteAccount')}
        />

        <Surface tone="warm" style={{ gap: theme.spacing.md }}>
          <Text color="textSecondary">{t('settings.deleteExplain')}</Text>
          <Text color="textSecondary">{t('settings.deleteArchiveNote')}</Text>
          <Text color="textSecondary">{t('deletion.retainedSignals')}</Text>
        </Surface>

        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
          {state ? (
            <Surface tone="accent" style={{ gap: theme.spacing.md }}>
              <Text variant="title3">{t('deletion.statusTitle')}</Text>
              <Text color="textSecondary">{t(`deletion.states.${state}`)}</Text>
              {correlationId ? (
                <Text color="textTertiary" variant="footnote">
                  {t('deletion.correlation', { id: correlationId })}
                </Text>
              ) : null}
              {state === 'completed' ? (
                <Button
                  disabled={busy}
                  label={t('deletion.continue')}
                  onPress={handleFinish}
                />
              ) : null}
            </Surface>
          ) : codeSent ? (
            <>
              <Text color="textSecondary">
                {t('deletion.reauthentication')}
              </Text>
              <TextField
                autoCapitalize="none"
                inputMode="numeric"
                keyboardType="number-pad"
                label={t('auth.codeLabel')}
                maxLength={6}
                onChangeText={setCode}
                value={code}
              />
              <Button
                disabled={busy || code.trim().length !== 6}
                label={t('deletion.verifyAction')}
                onPress={handleVerifyAndDelete}
                variant="danger"
              />
            </>
          ) : confirming ? (
            <>
              <Text color="danger">{t('settings.deleteConfirm')}</Text>
              <Button
                disabled={busy}
                label={t('settings.deleteConfirmAction')}
                onPress={handleDelete}
                variant="danger"
              />
              <Button
                label={t('common.cancel')}
                onPress={() => setConfirming(false)}
                variant="secondary"
              />
            </>
          ) : (
            <Button
              label={t('settings.deleteAccount')}
              onPress={() => setConfirming(true)}
              variant="danger"
            />
          )}

          {error ? (
            <Text color="danger" variant="footnote">
              {error}
            </Text>
          ) : null}
        </View>
      </Screen>
    </>
  );
}
