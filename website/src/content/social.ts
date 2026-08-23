import type { Locale } from './site';

interface SocialCopy {
  imageAlt: string;
  cardEyebrow: string;
  cardSupporting: string;
  templateLabel: string;
  templateFirstName: string;
  templateCountry: string;
  templateQuote: string;
}

export const socialContent: Record<Locale, SocialCopy> = {
  en: {
    imageAlt:
      'Unumae editorial card: 8 billion people. One today. One person, one global day.',
    cardEyebrow: 'One person · One global day',
    cardSupporting: 'Meet one person. Come back tomorrow.',
    templateLabel: 'Today’s Human',
    templateFirstName: '[First name]',
    templateCountry: '[Country]',
    templateQuote: '[One approved quote from their portrait]',
  },
  fr: {
    imageAlt:
      'Carte éditoriale Unumae : 8 milliards de personnes. Une aujourd’hui. Une personne, une journée mondiale.',
    cardEyebrow: 'Une personne · Une journée mondiale',
    cardSupporting: 'Rencontrez une personne. Revenez demain.',
    templateLabel: 'L’Humain du jour',
    templateFirstName: '[Prénom]',
    templateCountry: '[Pays]',
    templateQuote: '[Une citation approuvée de son portrait]',
  },
  de: {
    imageAlt:
      'Unumae-Redaktionskarte: 8 Milliarden Menschen. Heute einer. Ein Mensch, ein globaler Tag.',
    cardEyebrow: 'Ein Mensch · Ein globaler Tag',
    cardSupporting: 'Begegne einem Menschen. Komm morgen wieder.',
    templateLabel: 'Der Mensch des Tages',
    templateFirstName: '[Vorname]',
    templateCountry: '[Land]',
    templateQuote: '[Ein freigegebenes Zitat aus dem Porträt]',
  },
};
