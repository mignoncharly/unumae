import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Three environments from day one (Phase 1). Never one Supabase project for
 * everything — see docs/ARCHITECTURE.md and docs/ENVIRONMENTS.md.
 */
type AppEnv = 'development' | 'staging' | 'production';

const APP_ENV = (process.env.APP_ENV ?? 'development') as AppEnv;

/**
 * The production identifier is the one registered in the Apple Developer
 * account — `com.unumae.app`. It must match exactly or Sign in with Apple
 * fails, so it is not ours to choose.
 *
 * Dev and staging are suffixes of it so all three can be installed side by
 * side. Each needs its own App ID with the Sign in with Apple capability
 * enabled, or auth will only work in production builds.
 */
const PRODUCTION_BUNDLE_ID = 'com.unumae.app';

const ENVIRONMENTS: Record<
  AppEnv,
  { name: string; bundleId: string; scheme: string }
> = {
  development: {
    name: 'ONE HUMAN (Dev)',
    bundleId: `${PRODUCTION_BUNDLE_ID}.dev`,
    scheme: 'onehuman-dev',
  },
  staging: {
    name: 'ONE HUMAN (Staging)',
    bundleId: `${PRODUCTION_BUNDLE_ID}.staging`,
    scheme: 'onehuman-staging',
  },
  production: {
    name: 'ONE HUMAN',
    bundleId: PRODUCTION_BUNDLE_ID,
    scheme: 'onehuman',
  },
};

/**
 * A staging or production build pointed at the development database would let
 * a test run destroy real data, and the mistake is invisible until it is not.
 *
 * Non-development builds must therefore supply their own Supabase URL — from
 * EAS environment variables, never from the committed `.env` — and it must be
 * a different project from the development one.
 */
function assertEnvironmentIsolation(): void {
  if (APP_ENV === 'development') {
    return;
  }

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const developmentUrl = process.env.DEVELOPMENT_SUPABASE_URL;

  if (!url) {
    throw new Error(
      `APP_ENV=${APP_ENV} requires EXPO_PUBLIC_SUPABASE_URL. Set it in the EAS environment for this profile.`
    );
  }

  if (developmentUrl && url === developmentUrl) {
    throw new Error(
      `APP_ENV=${APP_ENV} is pointed at the development Supabase project. Give ${APP_ENV} its own project.`
    );
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const env = ENVIRONMENTS[APP_ENV];

  assertEnvironmentIsolation();

  return {
    ...config,
    name: env.name,
    slug: 'onehuman',
    version: '0.1.0',
    orientation: 'portrait',
    scheme: env.scheme,
    userInterfaceStyle: 'automatic',
    ios: {
      supportsTablet: false,
      bundleIdentifier: env.bundleId,
    },
    android: {
      package: env.bundleId,
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
      [
        'expo-splash-screen',
        {
          backgroundColor: '#FFFFFF',
          dark: { backgroundColor: '#0B0B0C' },
          resizeMode: 'contain',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      appEnv: APP_ENV,
    },
  };
};
