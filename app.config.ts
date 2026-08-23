import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * One Supabase project, one EAS project, one bundle identifier.
 *
 * An earlier revision carried development / staging / production triples. That
 * separation was removed deliberately: this project uses a single database for
 * its whole lifecycle, and configuration that pretends otherwise is a source of
 * mistakes rather than a safeguard. See docs/ENVIRONMENTS.md.
 *
 * iOS first. The Android block stays so the project remains cross-platform —
 * nothing here is iOS-only by construction — but no Android work is done yet.
 */
const BUNDLE_ID = 'com.unumae.app';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Unumae',
  slug: 'unumae',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'onehuman',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: BUNDLE_ID,
    // Required for the Sign in with Apple entitlement. Without it the native
    // button appears and the request fails at the system level.
    usesAppleSignIn: true,
    /*
     * The iOS privacy manifest.
     *
     * Two declarations Apple checks, and one it does not but reviewers read:
     *
     *   NSPrivacyTracking: false — nothing here follows anybody across other
     *   apps or websites, there is no advertising SDK, and no data is shared
     *   with a data broker. That is a product decision, not a compliance one.
     *
     *   NSPrivacyAccessedAPITypes — the "required reason" APIs. Both are used
     *   indirectly: UserDefaults through AsyncStorage, file timestamps through
     *   the image picker and manipulator.
     *
     * See docs/APP_STORE.md for the privacy-label answers that accompany this.
     */
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailAddress',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            'NSPrivacyCollectedDataTypePurposeAppFunctionality',
          ],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeName',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            'NSPrivacyCollectedDataTypePurposeAppFunctionality',
          ],
        },
        {
          NSPrivacyCollectedDataType:
            'NSPrivacyCollectedDataTypePhotosorVideos',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            'NSPrivacyCollectedDataTypePurposeAppFunctionality',
          ],
        },
        {
          NSPrivacyCollectedDataType:
            'NSPrivacyCollectedDataTypeOtherUserContent',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            'NSPrivacyCollectedDataTypePurposeAppFunctionality',
          ],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeDeviceID',
          // The random install identifier. Linked, because it sits in the same
          // row as a user id once somebody signs in, and saying otherwise
          // would be a technicality rather than the truth.
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            'NSPrivacyCollectedDataTypePurposeAnalytics',
          ],
        },
        {
          NSPrivacyCollectedDataType:
            'NSPrivacyCollectedDataTypeProductInteraction',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            'NSPrivacyCollectedDataTypePurposeAnalytics',
          ],
        },
      ],
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          // CA92.1 — accessing UserDefaults for this app only, via
          // AsyncStorage.
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          // C617.1 — timestamps of files inside the app container, reached
          // through the image picker and manipulator.
          NSPrivacyAccessedAPITypeReasons: ['C617.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          // E174.1 — writing a downscaled photograph needs to know there is
          // room for it.
          NSPrivacyAccessedAPITypeReasons: ['E174.1'],
        },
      ],
    },
  },
  android: {
    package: BUNDLE_ID,
  },
  web: {
    bundler: 'metro',
    output: 'static',
  },
  plugins: [
    'expo-router',
    'expo-localization',
    'expo-status-bar',
    'expo-secure-store',
    'expo-apple-authentication',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
        dark: { backgroundColor: '#0B0B0C' },
        resizeMode: 'contain',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Unumae uses your photo library so you can choose the photograph for your portrait.',
      },
    ],
    // Sharing a rendered card rather than only a link. Both this and
    // react-native-view-shot are in Expo Go's bundled modules, but the capture
    // is still loaded lazily and falls back to a text share if it is missing —
    // see src/features/sharing/card.ts.
    'expo-sharing',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      // `eas init` cannot write into a dynamic config, so this is set by hand.
      // Not a secret: it identifies the project, it does not authorise anything.
      projectId: '75cfb922-5d90-4436-965d-e67672558ed3',
    },
  },
  owner: 'mignoncharly',
});
