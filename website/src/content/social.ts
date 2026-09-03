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
      'Unumae editorial card: The journey is yours. One person, one unfolding story.',
    cardEyebrow: 'One person · One unfolding story',
    cardSupporting: 'Come for the moments. Return to the Journey.',
    templateLabel: 'Chosen One',
    templateFirstName: '[First name]',
    templateCountry: '[Country]',
    templateQuote: '[One approved quote from their portrait]',
  },
  fr: {
    imageAlt:
      'Carte éditoriale Unumae : Le voyage t’appartient. Une personne, une histoire qui se déroule.',
    cardEyebrow: 'Une personne · Une histoire qui se déroule',
    cardSupporting: 'Venez pour les moments. Revenez à la Journey.',
    templateLabel: 'Élu·e',
    templateFirstName: '[Prénom]',
    templateCountry: '[Pays]',
    templateQuote: '[Une citation approuvée de son portrait]',
  },
  de: {
    imageAlt:
      'Unumae-Redaktionskarte: Die Reise gehört dir. Ein Mensch, eine Geschichte in Bewegung.',
    cardEyebrow: 'Ein Mensch · Eine Geschichte in Bewegung',
    cardSupporting: 'Komm für die Momente. Komm zur Journey zurück.',
    templateLabel: 'Chosen One',
    templateFirstName: '[Vorname]',
    templateCountry: '[Land]',
    templateQuote: '[Ein freigegebenes Zitat aus dem Porträt]',
  },
};
