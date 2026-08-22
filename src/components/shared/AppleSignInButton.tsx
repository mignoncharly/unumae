import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/Text';
import {
  appleUnavailableReason,
  isAppleAuthAvailable,
  loadAppleModule,
} from '@/features/auth/appleAuth';
import { useTheme } from '@/theme';

interface AppleSignInButtonProps {
  onPress: () => void;
}

/**
 * Renders Apple's native button where it can work, and a quiet explanation
 * where it cannot.
 *
 * The module is resolved lazily, so this file is safe to import on Android and
 * in Expo Go — which is where development happens today.
 */
export function AppleSignInButton({ onPress }: AppleSignInButtonProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    void isAppleAuthAvailable().then((result) => {
      if (active) {
        setAvailable(result);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const apple = loadAppleModule();

  if (!available || !apple) {
    // Expo Go signs its own bundle and so cannot carry this app's entitlement.
    // Saying that plainly beats a button that fails, and beats silence that
    // makes a developer wonder whether the feature was ever built.
    if (appleUnavailableReason() === 'expo-go') {
      return (
        <Text color="textTertiary" variant="footnote">
          {t('auth.appleNeedsBuild')}
        </Text>
      );
    }
    return null;
  }

  return (
    <apple.AppleAuthenticationButton
      buttonStyle={
        theme.scheme === 'dark'
          ? apple.AppleAuthenticationButtonStyle.WHITE
          : apple.AppleAuthenticationButtonStyle.BLACK
      }
      buttonType={apple.AppleAuthenticationButtonType.SIGN_IN}
      cornerRadius={theme.radius.full}
      onPress={onPress}
      style={{ height: 48 }}
    />
  );
}
