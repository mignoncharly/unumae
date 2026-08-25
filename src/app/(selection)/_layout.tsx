import { Stack } from 'expo-router';

/**
 * Time-sensitive selection flow.
 *
 * Keeping this group as its own navigator lets the root layout configure the
 * whole flow through `<Stack.Screen name="(selection)" />`. Without a layout,
 * Expo Router flattens these screens into the root stack and reports that the
 * `(selection)` route does not exist.
 */
export default function SelectionLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
