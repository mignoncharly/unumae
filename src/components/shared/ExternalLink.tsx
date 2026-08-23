import * as Linking from 'expo-linking';
import { Pressable } from 'react-native';

import { Text } from '@/components/ui/Text';
import type { ColorToken } from '@/theme';

interface ExternalLinkProps {
  href: string;
  label: string;
  color?: ColorToken;
}

/**
 * Opens a page on the website in the system browser.
 *
 * Marked with an outward arrow rather than the inward one used for in-app
 * navigation, so leaving the app is never a surprise.
 */
export function ExternalLink({
  href,
  label,
  color = 'accent',
}: ExternalLinkProps) {
  return (
    <Pressable
      accessibilityHint={href}
      accessibilityRole="link"
      onPress={() => {
        // A missing browser or an unreachable domain is not worth a crash on a
        // settings screen.
        void Linking.openURL(href).catch(() => undefined);
      }}
      style={{ minHeight: 44, justifyContent: 'center' }}
    >
      <Text color={color}>{label} ↗</Text>
    </Pressable>
  );
}
