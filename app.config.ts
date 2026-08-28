import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * One EAS project, bundle identifier, and hosted Supabase project. Ordinary
 * development stays local. Explicit hosted development/device-test builds and
 * production builds use the same approved hosted project because Unumae does
 * not maintain a staging project.
 *
 * Both mobile platforms remain configured for portability. The current release
 * target is iOS; Android release evidence is explicitly deferred.
 */
const BUNDLE_ID = 'com.unumae.app';
const PRODUCTION_PROJECT_REF = 'qpicjsjxdblrxdrdibge';
const EAS_PROJECT_ID = '75cfb922-5d90-4436-965d-e67672558ed3';
const APP_ENV = process.env.APP_ENV ?? 'development';
const configuredProjectRef =
  /https:\/\/([a-z0-9]+)\.supabase\./.exec(
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
  )?.[1] ?? null;

if (!['development', 'hosted', 'production'].includes(APP_ENV)) {
  throw new Error(`Unsupported APP_ENV: ${APP_ENV}`);
}
if (APP_ENV === 'development' && configuredProjectRef !== null) {
  throw new Error('Local development cannot use a hosted Supabase project.');
}
if (
  (APP_ENV === 'hosted' || APP_ENV === 'production') &&
  configuredProjectRef !== PRODUCTION_PROJECT_REF
) {
  throw new Error(
    'Hosted builds must use the single approved Supabase project.'
  );
}
const IS_PRODUCTION_BUILD =
  process.env.EAS_BUILD_PROFILE === 'production' ||
  process.env.APP_ENV === 'production';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Unumae',
  slug: 'unumae',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'onehuman',
  /*
   * Over-the-air updates.
   *
   * The store review cycle is the wrong length for a crash. Without this, a
   * one-line JavaScript fix costs a resubmission and a day or more, during
   * which every user stays broken. With it, a JS-only fix ships in minutes to
   * the channel the build was cut from.
   *
   * `fallbackToCacheTimeout: 0` is the deliberate half of the trade: launch
   * from the cached bundle immediately and fetch in the background, rather
   * than making every cold start wait on the network. A person on a bad
   * connection gets yesterday's bundle now instead of a spinner.
   *
   * What this must never be used for: shipping behaviour Apple has not seen.
   * Guideline 3.3.1 permits bug fixes and content, not a different app.
   */
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    fallbackToCacheTimeout: 0,
  },
  /*
   * `appVersion` ties an update to the `version` above, so a bundle can only
   * reach a build whose native side it was compiled against. The looser
   * `sdkVersion` policy would let a bundle land on a binary with different
   * native modules — which is a crash, delivered automatically, to everyone.
   *
   * The consequence to remember: bumping `version` starts a new runtime, and
   * builds on the old one stop receiving updates. That is the correct
   * direction to be wrong in.
   */
  runtimeVersion: { policy: 'appVersion' },
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
    entitlements: {
      'com.apple.developer.devicecheck.appattest-environment':
        IS_PRODUCTION_BUILD ? 'production' : 'development',
    },
    config: {
      // Unumae uses only exempt encryption supplied by the operating system
      // and standard HTTPS. Encoding this keeps TestFlight/App Store Connect
      // from asking the same export-compliance question for every build.
      usesNonExemptEncryption: false,
    },
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
          // The random install identifier and platform attestation state.
          // Linked while an account exists; the retained platform flag and
          // database abuse record are opaque and are not used for tracking.
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            'NSPrivacyCollectedDataTypePurposeAnalytics',
            'NSPrivacyCollectedDataTypePurposeAppFunctionality',
          ],
        },
        {
          // Supabase Auth user id plus the stable Apple/Google provider id
          // used for account assurance.
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeUserID',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            'NSPrivacyCollectedDataTypePurposeAppFunctionality',
          ],
        },
        {
          // Country and optional city are typed by the person rather than read
          // from Location Services, but are still honestly declared as coarse
          // location data.
          NSPrivacyCollectedDataType:
            'NSPrivacyCollectedDataTypeCoarseLocation',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            'NSPrivacyCollectedDataTypePurposeAppFunctionality',
          ],
        },
        {
          // Birth year, account-assurance state and moderation/account status.
          NSPrivacyCollectedDataType:
            'NSPrivacyCollectedDataTypeOtherDataTypes',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            'NSPrivacyCollectedDataTypePurposeAppFunctionality',
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
    blockedPermissions: ['android.permission.RECORD_AUDIO'],
    softwareKeyboardLayoutMode: 'resize',
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#FFFFFF',
    },
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'https', host: 'unumae.app', pathPrefix: '/human/' },
          { scheme: 'https', host: 'www.unumae.app', pathPrefix: '/human/' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    bundler: 'metro',
    output: 'static',
  },
  plugins: [
    'expo-router',
    'expo-localization',
    'expo-status-bar',
    'expo-notifications',
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
        // Portraits are still images. Explicitly disabling microphone access
        // prevents the image-picker plugin from adding RECORD_AUDIO back after
        // the top-level Android blocked-permission list has been evaluated.
        microphonePermission: false,
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
    environment: APP_ENV,
    eas: {
      // `eas init` cannot write into a dynamic config, so this is set by hand.
      // Not a secret: it identifies the project, it does not authorise anything.
      projectId: '75cfb922-5d90-4436-965d-e67672558ed3',
    },
  },
  owner: 'mignoncharly',
});
