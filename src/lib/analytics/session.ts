import * as SecureStore from 'expo-secure-store';

const ANALYTICS_SESSION_KEY = 'unumae.attested_installation_session';

export async function getAnalyticsSessionToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ANALYTICS_SESSION_KEY);
  } catch {
    return null;
  }
}

export async function setAnalyticsSessionToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ANALYTICS_SESSION_KEY, token);
}

export async function clearAnalyticsSessionToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ANALYTICS_SESSION_KEY);
  } catch {
    /* best effort */
  }
}
