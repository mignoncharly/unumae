// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    // supabase/functions is Deno, not React Native: different globals, different
    // module resolution. It is checked by `deno check`, not by this config.
    ignores: [
      'dist/*',
      '.expo/*',
      'node_modules/*',
      'coverage/*',
      'supabase/functions/**',
    ],
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  {
    // Must come last: later blocks win. Verification scripts are CLIs, so
    // printing to stdout is their entire job.
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
]);
