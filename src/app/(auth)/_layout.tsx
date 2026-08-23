import { Stack } from 'expo-router';

/**
 * Signing in.
 *
 * This file exists so the group is a real route.
 *
 * Without a `_layout`, a group directory is not a navigator — Expo Router
 * flattens it and its children become `(auth)/sign-in` and `(auth)/verify` at
 * the root. The root layout was declaring `<Stack.Screen name="(auth)">` for
 * something that did not exist, which is what produced:
 *
 *   No route named "(auth)" exists in nested children
 *
 * It still worked, because navigating to `/(auth)/sign-in` resolves either way.
 * What silently did not work is the option attached to that declaration:
 * `presentation: 'modal'` was being applied to nothing at all.
 */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
