import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/theme';

import { Text } from './Text';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * The app's only modal surface: Ask, Report, language choice.
 *
 * A sheet is dismissible by tapping outside and by the hardware back button.
 * Nothing in this product traps a user in a decision.
 */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { t } = useTranslation();

  return (
    <Modal
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityLabel={t('common.close')}
        accessibilityRole="button"
        onPress={onClose}
        style={{ flex: 1, backgroundColor: theme.colors.overlay }}
      />
      <View
        style={{
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
          borderTopLeftRadius: theme.radius.xxl,
          borderTopRightRadius: theme.radius.xxl,
          borderWidth: 1,
          padding: theme.spacing.xl,
          paddingBottom: insets.bottom + theme.spacing.xl,
          gap: theme.spacing.lg,
        }}
      >
        <View
          style={{
            alignSelf: 'center',
            width: 36,
            height: 4,
            borderRadius: theme.radius.full,
            backgroundColor: theme.colors.border,
          }}
        />
        {title ? (
          <Text variant="title2" style={{ fontWeight: '600' }}>
            {title}
          </Text>
        ) : null}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}
