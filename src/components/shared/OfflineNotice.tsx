import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

/**
 * Says plainly that what you are reading came from the last time you had a
 * connection.
 *
 * Not an error, and not a modal. On a poor connection the app still works —
 * the cached cycle is there — and the only thing missing is the certainty that
 * it is current. So this states that, quietly, and gets out of the way.
 */
export function OfflineNotice() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // `isInternetReachable` rather than `isConnected`: being attached to a wifi
    // network that goes nowhere is the common case this is for.
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOffline(state.isInternetReachable === false);
    });

    return unsubscribe;
  }, []);

  if (!offline) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: theme.colors.surface,
        borderBottomColor: theme.colors.border,
        borderBottomWidth: 1,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
      }}
    >
      <Text color="textSecondary" variant="footnote">
        {t('offline.notice')}
      </Text>
    </View>
  );
}
