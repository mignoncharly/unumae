import {
  content,
  locales,
  localizedPath,
  type Locale,
  type RouteKey,
} from '../content/site';
import { socialContent } from '../content/social';

const openGraphLocales: Record<Locale, string> = {
  en: 'en_US',
  fr: 'fr_FR',
  de: 'de_DE',
};

const schemaTypes: Partial<Record<RouteKey, string>> = {
  about: 'AboutPage',
  archive: 'CollectionPage',
};

export interface PageMetadata {
  title: string;
  description: string;
  canonical: string;
  alternates: readonly { locale: Locale; href: string }[];
  noIndex: boolean;
  openGraphLocale: string;
  openGraphLocaleAlternates: readonly string[];
  socialImage: {
    url: string;
    alt: string;
    width: 1200;
    height: 630;
    type: 'image/png';
  };
  structuredData: Record<string, unknown>;
}

export function createPageMetadata(
  locale: Locale,
  page: RouteKey,
  site: URL
): PageMetadata {
  const pageCopy = content[locale].pages[page];
  const canonical = new URL(localizedPath(locale, page), site).toString();
  const root = new URL('/', site).toString();
  const organizationId = new URL('/#organization', site).toString();
  const websiteId = new URL('/#website', site).toString();
  const webpageId = `${canonical}#webpage`;
  const imageUrl = new URL(`/social/unumae-${locale}.png`, site).toString();
  const title = page === 'home' ? pageCopy.title : `${pageCopy.title} — Unumae`;
  const socialImage = {
    url: imageUrl,
    alt: socialContent[locale].imageAlt,
    width: 1200 as const,
    height: 630 as const,
    type: 'image/png' as const,
  };

  return {
    title,
    description: pageCopy.description,
    canonical,
    alternates: locales.map((alternateLocale) => ({
      locale: alternateLocale,
      href: new URL(localizedPath(alternateLocale, page), site).toString(),
    })),
    noIndex: pageCopy.noIndex ?? false,
    openGraphLocale: openGraphLocales[locale],
    openGraphLocaleAlternates: locales
      .filter((alternateLocale) => alternateLocale !== locale)
      .map((alternateLocale) => openGraphLocales[alternateLocale]),
    socialImage,
    structuredData: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': organizationId,
          name: 'Unumae',
          url: root,
          logo: {
            '@type': 'ImageObject',
            url: new URL('/icons/icon-512.png', site).toString(),
            width: 512,
            height: 512,
          },
        },
        {
          '@type': 'WebSite',
          '@id': websiteId,
          name: 'Unumae',
          url: root,
          inLanguage: locale,
          publisher: { '@id': organizationId },
        },
        {
          '@type': schemaTypes[page] ?? 'WebPage',
          '@id': webpageId,
          url: canonical,
          name: title,
          description: pageCopy.description,
          inLanguage: locale,
          isPartOf: { '@id': websiteId },
          about: { '@id': organizationId },
          primaryImageOfPage: {
            '@type': 'ImageObject',
            url: socialImage.url,
            width: socialImage.width,
            height: socialImage.height,
          },
        },
      ],
    },
  };
}
