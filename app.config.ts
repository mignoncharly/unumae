import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Three environments from day one (Phase 1). Never one Supabase project for
 * everything — see docs/ARCHITECTURE.md.
 */
type AppEnv = 'development' | 'staging' | 'production';

const APP_ENV = (process.env.APP_ENV ?? 'development') as AppEnv;

const ENVIRONMENTS: Record<
  AppEnv,
  { name: string; bundleId: string; scheme: string }
> = {
  development: {
    name: 'ONE HUMAN (Dev)',
    bundleId: 'app.onehuman.dev',
    scheme: 'onehuman-dev',
  },
  staging: {
    name: 'ONE HUMAN (Staging)',
    bundleId: 'app.onehuman.staging',
    scheme: 'onehuman-staging',
  },
  production: {
    name: 'ONE HUMAN',
    bundleId: 'app.onehuman',
    scheme: 'onehuman',
  },
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const env = ENVIRONMENTS[APP_ENV];

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
