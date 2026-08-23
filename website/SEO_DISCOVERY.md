# Search and AI discovery

Unumae publishes a generated XML sitemap, crawler directives, canonical URLs,
Open Graph/Twitter preview metadata, JSON-LD page metadata, and an `llms.txt`
orientation file. These improve machine understanding but do not guarantee
ranking or citation by a search engine or AI assistant.

## Sitemap and robots

- Sitemap index: `https://unumae.app/sitemap.xml`
- Crawler directives: `https://unumae.app/robots.txt`
- AI orientation: `https://unumae.app/llms.txt`

The sitemap is generated at build time from the public English, French, and
German routes. Development pages are excluded from the sitemap and disallowed
in `robots.txt`; health checks are also disallowed.

## Google Search Console

1. Verify the `unumae.app` domain property (DNS verification is preferred).
2. Open **Sitemaps** and submit `sitemap.xml`.
3. Use **URL inspection** for the home, Today, Archive, and selection pages;
   request indexing after the first production deployment and after substantial
   editorial changes.
4. Review indexing, enhancements, and crawl errors periodically.

## Bing Webmaster Tools

1. Add and verify `https://unumae.app` (importing the verified Google property
   is also supported).
2. Submit `https://unumae.app/sitemap.xml` under **Sitemaps**.
3. Use URL inspection for important pages and monitor crawl/index coverage.

## Content that earns useful citations

Unumae uses durable, first-party explainers rather than generic listicles:

- the product premise and boundaries on the home and About pages;
- the step-by-step selection and publication process;
- community rules that answer what visitors may ask and share;
- privacy, consent, removal, and archive behavior;
- live and archived stories, cited by their canonical page and retrieval date.

When adding future editorial pages, prefer one clear question per page, a direct
answer near the top, named definitions, dated facts, links to primary policy
pages, and visible evidence. Do not create comparison, review, trend, or case
study pages unless Unumae has a truthful first-party subject for them.

## Important limitation

Today and Archive records are live client-side data. Their static social and
search metadata is intentionally generic until a server-rendered, consented
story share page exists. A future dynamic share page must never expose a
portrait or quote before the same publication and moderation gates used by the
public app.
