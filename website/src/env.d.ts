/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SITE_ORIGIN?: string;
  readonly PUBLIC_ANALYTICS_ENDPOINT?: string;
  readonly PUBLIC_DATA_MODE?: 'off' | 'live';
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
