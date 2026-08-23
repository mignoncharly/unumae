// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

const { SITE_ORIGIN } = loadEnv(
  process.env.NODE_ENV ?? 'development',
  process.cwd(),
  ''
);
const site = SITE_ORIGIN || 'http://localhost:4321';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'never',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr', 'de'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      filter: (page) => !new URL(page).pathname.startsWith('/dev/'),
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', fr: 'fr', de: 'de' },
      },
    }),
  ],
});
