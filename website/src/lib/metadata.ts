import {
  content,
  locales,
  localizedPath,
  type Locale,
  type RouteKey,
} from '../content/site';

export interface PageMetadata {
  title: string;
  description: string;
  canonical: string;
  alternates: readonly { locale: Locale; href: string }[];
  noIndex: boolean;
}

export function createPageMetadata(
  locale: Locale,
  page: RouteKey,
  site: URL
): PageMetadata {
  const pageCopy = content[locale].pages[page];

  return {
    title: page === 'home' ? pageCopy.title : `${pageCopy.title} — Unumae`,
    description: pageCopy.description,
    canonical: new URL(localizedPath(locale, page), site).toString(),
    alternates: locales.map((alternateLocale) => ({
      locale: alternateLocale,
      href: new URL(localizedPath(alternateLocale, page), site).toString(),
    })),
    noIndex: pageCopy.noIndex ?? false,
  };
}
