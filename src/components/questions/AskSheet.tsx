import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { QUESTION_MAX_LENGTH } from '@/constants/constitution';
import { useTheme } from '@/theme';

interface AskSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (body: string) => Promise<void>;
}

const MIN_LENGTH = 10;

/**
 * Asking a question.
 *
 * The counter shows what is left rather than what is used: 180 characters is a
 * constraint that improves questions (Article 9.2), and framing it as a budget
 * makes it feel like one rather than a punishment.
 */
export function AskSheet({ visible, onClose, onSubmit }: AskSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const remaining = QUESTION_MAX_LENGTH - body.length;
  const canSubmit = body.trim().length >= MIN_LENGTH && !busy;

  async function handleSubmit() {
    setBusy(true);
    setError(undefined);
    try {
      await onSubmit(body);
      setBody('');
      onClose();
    } catch {
      setError(t('questions.askFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet onClose={onClose} title={t('questions.ask')} visible={visible}>
      <View style={{ gap: theme.spacing.md }}>
        <TextField
          autoFocus
          error={error}
          hint={t('questions.remaining', { count: remaining })}
          label={t('questions.title')}
          maxLength={QUESTION_MAX_LENGTH}
          multiline
          onChangeText={setBody}
          placeholder={t('questions.placeholder')}
          value={body}
        />

        <Text color="textTertiary" variant="footnote">
          {t('questions.moderationNote')}
        </Text>

        <Button
          disabled={!canSubmit}
          icon="send"
          label={t('questions.send')}
          onPress={handleSubmit}
        />
      </View>
    </Sheet>
  );
}
