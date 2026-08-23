import type { APIRoute } from 'astro';
import {
  locales,
  localizedPath,
  pageKeys,
  type Locale,
  type RouteKey,
} from '../content/site';

export const prerender = true;

const xmlEscape = (value: string) =>
  value.replace(
    /[<>&'\"]+/g,
    (character) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;',
      })[character] ?? character
  );

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('http://localhost:4321');
  const routes: Array<{ locale: Locale; page: RouteKey }> = [
    ...locales.flatMap((locale) => [
      { locale, page: 'home' as const },
      ...pageKeys.map((page) => ({ locale, page })),
    ]),
  ];
  const urls = routes
    .map(
      ({ locale, page }) =>
        `  <url><loc>${xmlEscape(new URL(localizedPath(locale, page), origin).toString())}</loc></url>`
    )
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
