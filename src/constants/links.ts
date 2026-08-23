/**
 * The public website.
 *
 * `website/` is the marketing and legal surface; the app links out to it rather
 * than carrying its own copy of the same pages. One source of truth for text
 * that gets reviewed, and no risk of the two drifting apart.
 *
 * Two pages stay inside the app on purpose:
 *
 *   how-selection-works   Article 12 requires the product to be able to explain
 *                         itself. That should not depend on a browser, a
 *                         network, or a domain being up.
 *   community rules       Accepting them is an action with a database effect,
 *                         so the text a person agrees to has to be the text the
 *                         app showed them.
 */
export const WEBSITE_URL = 'https://unumae.app';

export const websiteLinks = {
  home: WEBSITE_URL,
  today: `${WEBSITE_URL}/today`,
  about: `${WEBSITE_URL}/about`,
  archive: `${WEBSITE_URL}/archive`,
  howSelectionWorks: `${WEBSITE_URL}/how-selection-works`,
  communityGuidelines: `${WEBSITE_URL}/community-guidelines`,
  privacy: `${WEBSITE_URL}/privacy`,
  terms: `${WEBSITE_URL}/terms`,
} as const;

/** A shared Human's public page. */
export function humanUrl(drawId: string): string {
  return `${WEBSITE_URL}/human/${drawId}`;
}
