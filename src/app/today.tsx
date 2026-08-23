import { Redirect } from 'expo-router';

/**
 * The public share URL is /today. Keep that stable while routing an installed
 * app to its tab-index implementation.
 */
export default function TodayUniversalLink() {
  return <Redirect href="/(tabs)" />;
}
