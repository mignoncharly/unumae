import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('http://localhost:4321');
  const sitemap = new URL('/sitemap-index.xml', origin);

  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /dev/\nDisallow: /healthz\nSitemap: ${sitemap}\n`,
    {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    }
  );
};
