import {
  content,
  locales,
  localizedPath,
  type Locale,
  type RouteKey,
} from '../content/site';
import { socialContent } from '../content/social';
import type { PublicHuman } from './public-data';

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

const humanDescription = (
  locale: Locale,
  name: string,
  number: string,
  place: string,
  date: string
) => {
  if (locale === 'fr') {
    return `Rencontrez ${name}, Humain ${number}${place ? ` de ${place}` : ''}, publié dans les Archives humaines d’Unumae le ${date}.`;
  }
  if (locale === 'de') {
    return `Begegne ${name}, Mensch ${number}${place ? ` aus ${place}` : ''}, veröffentlicht im Unumae-Menschenarchiv am ${date}.`;
  }
  return `Meet ${name}, Human ${number}${place ? ` from ${place}` : ''}, published in the Unumae Human Archive on ${date}.`;
};

export function createHumanMetadata(
  locale: Locale,
  human: PublicHuman,
  site: URL
): PageMetadata {
  if (human.is_removed || !human.display_name || human.human_number === null) {
    throw new Error('Person-specific metadata requires a published Human.');
  }

  const path = (targetLocale: Locale) =>
    `${targetLocale === 'en' ? '' : `/${targetLocale}`}/human/${human.draw_id}`;
  const canonical = new URL(path(locale), site).toString();
  const root = new URL('/', site).toString();
  const organizationId = new URL('/#organization', site).toString();
  const websiteId = new URL('/#website', site).toString();
  const number = `#${String(human.human_number).padStart(4, '0')}`;
  const regionNames = new Intl.DisplayNames([locale], { type: 'region' });
  const place = [
    human.city,
    human.country_code ? regionNames.of(human.country_code) : null,
  ]
    .filter(Boolean)
    .join(', ');
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${human.selection_date}T00:00:00Z`));
  const title = `${human.display_name} · ${number} · Unumae`;
  const description = humanDescription(
    locale,
    human.display_name,
    number,
    place,
    date
  );
  const socialImage = {
    url: new URL(
      `/social/human/${human.draw_id}-${locale}.png`,
      site
    ).toString(),
    alt: `${human.display_name} · ${number} · Unumae`,
    width: 1200 as const,
    height: 630 as const,
    type: 'image/png' as const,
  };

  return {
    title,
    description,
    canonical,
    alternates: locales.map((targetLocale) => ({
      locale: targetLocale,
      href: new URL(path(targetLocale), site).toString(),
    })),
    noIndex: false,
    openGraphLocale: openGraphLocales[locale],
    openGraphLocaleAlternates: locales
      .filter((targetLocale) => targetLocale !== locale)
      .map((targetLocale) => openGraphLocales[targetLocale]),
    socialImage,
    structuredData: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': organizationId,
          name: 'Unumae',
          url: root,
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
          '@type': 'ProfilePage',
          '@id': `${canonical}#webpage`,
          url: canonical,
          name: title,
          description,
          inLanguage: locale,
          dateCreated: human.published_at ?? human.selection_date,
          isPartOf: { '@id': websiteId },
          primaryImageOfPage: {
            '@type': 'ImageObject',
            url: socialImage.url,
            width: socialImage.width,
            height: socialImage.height,
          },
          mainEntity: {
            '@type': 'Person',
            name: human.display_name,
            identifier: number,
            ...(place
              ? { homeLocation: { '@type': 'Place', name: place } }
              : {}),
          },
        },
      ],
    },
  };
}
