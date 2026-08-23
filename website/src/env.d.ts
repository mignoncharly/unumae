/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SITE_ORIGIN?: string;
  readonly PUBLIC_ANALYTICS_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
