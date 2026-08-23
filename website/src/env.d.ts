/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SITE_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
