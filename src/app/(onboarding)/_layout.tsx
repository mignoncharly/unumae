import { Stack } from 'expo-router';

/**
 * Finishing a profile.
 *
 * Same reason as `(auth)/_layout.tsx`: without this the group is not a route,
 * and the root layout's options for it — `presentation: 'modal'` and
 * `gestureEnabled: false` — were being applied to nothing.
 *
 * The second of those matters here. Onboarding is not dismissible by swiping
 * back, because a half-made profile is not a state the rest of the app is
 * written to handle.
 */
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />
  );
}
