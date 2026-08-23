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
  /*
   * 1254×1254 and deliberately opaque — Apple rejects an icon with an alpha
   * channel, and applies the rounded mask itself, so the source must be a full
   * square with no transparency and no pre-rounded corners. Both hold here.
   *
   * Larger than the 1024×1024 Apple ultimately wants. That is fine: Expo
   * generates every size from this source with a proper resampler, and giving
   * it more pixels than it needs is the safe direction to be wrong in.
   */
  icon: './assets/icon.png',
  ios: {
    supportsTablet: false,
    bundleIdentifier: BUNDLE_ID,
    associatedDomains: ['applinks:unumae.app', 'applinks:www.unumae.app'],
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
        image: './assets/splash.png',
        imageWidth: 240,
        backgroundColor: '#FFFFFF',
        /*
         * The dark variant deliberately keeps the light background.
         *
         * The wordmark is a blue-to-purple gradient on transparency, and its
         * darkest ink is rgb(0, 6, 140). Against #0B0B0C that measures 1.32:1
         * at worst and 1.94:1 on average, where 3:1 is the floor for large
         * text — it would be very nearly invisible on a dark-mode device.
         *
         * So this is a white card on both, which is legible everywhere, rather
         * than a dark card nobody can read. The proper fix is a light version
         * of the wordmark; when one exists it goes here as
         * `dark: { image: './assets/splash-dark.png', backgroundColor: '#0B0B0C' }`.
         */
        dark: { backgroundColor: '#FFFFFF' },
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
    // Required directly by @expo/vector-icons, which the tab bar uses. Expo Go
    // bundles it, so a missing entry here is invisible in development and a
    // crash in a production build — expo-doctor is what caught it.
    'expo-font',
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
