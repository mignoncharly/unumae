export interface HumanShareCardInput {
  firstName: string;
  country: string;
  quote: string;
  publicationStatus: string;
  quoteModerationStatus: string;
  isRemoved?: boolean;
}

export interface ApprovedHumanShareCard {
  firstName: string;
  country: string;
  quote: string;
}

/**
 * The publication gate for a Human social card.
 *
 * Candidate, invited, draft, review, removed, and completed stories must never
 * enter a Today preview. The caller can only receive renderable content while
 * the Human is live and the selected quote is explicitly approved.
 */
export function prepareHumanShareCard(
  input: HumanShareCardInput
): ApprovedHumanShareCard {
  if (
    input.publicationStatus !== 'live' ||
    input.quoteModerationStatus !== 'approved' ||
    input.isRemoved
  ) {
    throw new Error('A Human share card requires live, approved content.');
  }

  const firstName = input.firstName.trim();
  const country = input.country.trim();
  const quote = input.quote.trim();
  if (!firstName || !country || !quote) {
    throw new Error('A Human share card requires a name, country, and quote.');
  }
  if (
    firstName.length > 24 ||
    country.length > 32 ||
    quote.length > 110 ||
    quote.split(/\s+/).some((word) => word.length > 38)
  ) {
    throw new Error('Human share-card copy exceeds the reviewed layout.');
  }

  return { firstName, country, quote };
}

export function wrapSocialQuote(value: string, lineLength = 38): string[] {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];

  for (const word of words) {
    const current = lines.at(-1);
    if (!current || `${current} ${word}`.length > lineLength) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${current} ${word}`;
    }
  }

  return lines.slice(0, 3);
}
