import { Share } from 'react-native';

import { humanUrl, WEBSITE_URL, websiteLinks } from '@/constants/links';
import { track } from '@/lib/analytics';
import { formatHumanNumber } from '@/utils/cycle';

/**
 * Sharing a Human.
 *
 * A shared link has to be understandable to somebody who has never heard of
 * this product and has not installed anything — that is the whole point of the
 * web page it points at. So the message says who, where, and what the product
 * is, in four lines.
 *
 * What it deliberately does not say: how many people saw them, how many
 * Remembers they have, or anything that would turn a person into a metric.
 */

/** Where a shared link lands. The site lives in website/. */
export const SHARE_BASE_URL = WEBSITE_URL;

export interface ShareableHuman {
  humanNumber: number;
  name: string;
  countryName: string;
  flag: string;
  /** One line from their portrait, if there is a good one to quote. */
  quote?: string | null;
  drawId: string;
  isToday: boolean;
}

export function shareUrl(human: ShareableHuman): string {
  return human.isToday ? websiteLinks.today : humanUrl(human.drawId);
}

/**
 * The message. Built as a pure function so the wording can be tested without
 * opening a share sheet.
 */
export function buildShareMessage(
  human: ShareableHuman,
  tagline: string
): string {
  const lines = [
    formatHumanNumber(human.humanNumber),
    '',
    human.name,
    `${human.flag} ${human.countryName}`.trim(),
  ];

  if (human.quote) {
    lines.push('', `"${human.quote}"`);
  }

  lines.push('', tagline, shareUrl(human));

  return lines.join('\n');
}

/**
 * Opens the system share sheet.
 *
 * The caller records intent; this function records only what the native API
 * can establish: that the share sheet opened.
 */
export async function shareHuman(
  human: ShareableHuman,
  tagline: string
): Promise<boolean> {
  try {
    const result = await Share.share({
      message: buildShareMessage(human, tagline),
      url: shareUrl(human),
    });

    // React Native can establish that the native sheet opened, but not that a
    // recipient received the message. Keep the metric at that honest boundary.
    track('share_sheet_opened', { today: human.isToday, card: false });
    const shared = result.action === Share.sharedAction;
    return shared;
  } catch {
    // Dismissing a share sheet is not an error worth surfacing.
    return false;
  }
}
