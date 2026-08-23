import { Redirect, Stack } from 'expo-router';

/**
 * The developer screens, sealed off from a release build.
 *
 * Hiding the links in Settings is not enough on its own. The app registers a
 * URL scheme and has universal links, so `/dev/tokens` stays reachable by deep
 * link whether or not anything on screen points at it — and a route that can
 * only be found by people who already know it is still a shipped route.
 *
 * `__DEV__` is false in any release build, so in production these four screens
 * redirect to Today instead of rendering.
 */
export default function DevLayout() {
  if (!__DEV__) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: true }} />;
}
