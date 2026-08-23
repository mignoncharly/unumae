export const locales = ['en', 'fr', 'de'] as const;
export const translatedLocales = ['fr', 'de'] as const;
export const pageKeys = [
  'today',
  'about',
  'how-selection-works',
  'archive',
  'community-guidelines',
  'privacy',
  'terms',
] as const;

export type Locale = (typeof locales)[number];
export type PageKey = (typeof pageKeys)[number];
export type RouteKey = 'home' | PageKey;

interface PageCopy {
  title: string;
  description: string;
  eyebrow: string;
  introduction: string;
  notice?: string;
  noIndex?: boolean;
}

interface SiteCopy {
  languageName: string;
  skipToContent: string;
  navigationLabel: string;
  languageLabel: string;
  homeLabel: string;
  comingSoon: string;
  navigation: Record<PageKey, string>;
  pages: Record<RouteKey, PageCopy>;
  facts: readonly { value: string; label: string }[];
  footerStatement: string;
}

export const content: Record<Locale, SiteCopy> = {
  en: {
    languageName: 'English',
    skipToContent: 'Skip to content',
    navigationLabel: 'Primary navigation',
    languageLabel: 'Language',
    homeLabel: 'Unumae home',
    comingSoon: 'Coming to iPhone',
    navigation: {
      today: 'Today',
      about: 'About',
      'how-selection-works': 'How selection works',
      archive: 'The Archive',
      'community-guidelines': 'Community guidelines',
      privacy: 'Privacy',
      terms: 'Terms',
    },
    pages: {
      home: {
        title: '8 billion people. One today.',
        description:
          'Every day, one ordinary person becomes Today’s Human. Discover their story for 24 hours and remember them in the Human Archive.',
        eyebrow: 'Unumae',
        introduction:
          'Every day, one ordinary person from the community becomes Today’s Human. The world discovers their story for 24 hours, asks them questions, and remembers them in the Human Archive.',
      },
      today: {
        title: 'Today’s Human',
        description:
          'The public home of Today’s Human, designed to make every shared story understandable without installing the app.',
        eyebrow: 'Today',
        introduction:
          'When Unumae launches, this is where the world will meet one person for one global 24-hour window. Every story will remain open to guests.',
        notice: 'There is no public Human yet. Unumae is preparing for launch.',
      },
      about: {
        title: 'One person, seen properly.',
        description:
          'Why Unumae introduces one ordinary person to the world each day—and deliberately stops there.',
        eyebrow: 'About Unumae',
        introduction:
          'Unumae is built around attention with limits: one person, one day, one finite story. There are no followers, rankings, or endless feed competing with them.',
      },
      'how-selection-works': {
        title: 'An equal chance means equal.',
        description:
          'How Unumae freezes the eligible pool, records the daily draw, and keeps payment, fame, and engagement out of selection.',
        eyebrow: 'How selection works',
        introduction:
          'Two days before each cycle, the eligible pool is frozen. A secure seed orders one primary candidate and three backups. The result is recorded and reproducible.',
      },
      archive: {
        title: 'Everyone the world has met.',
        description:
          'The Human Archive is a chronological record explored by time, country, year, or at random—never by popularity.',
        eyebrow: 'The Archive',
        introduction:
          'After each live day, the Human joins a permanent sequence. A person can still ask to leave; their number and date remain as a quiet tombstone.',
        notice: 'The Archive begins when the first Human goes live.',
      },
      'community-guidelines': {
        title: 'Treat a stranger with respect.',
        description:
          'The public rules that protect Today’s Human and keep Unumae free from competition, promotion, and harassment.',
        eyebrow: 'Community guidelines',
        introduction:
          'Ask what you would ask a stranger you respected. Questions are welcome; verdicts, promotion, harassment, and attempts at private contact are not.',
        notice:
          'The complete approved community rules will be published here in the trust-pages phase.',
      },
      privacy: {
        title: 'Privacy policy',
        description:
          'Unumae’s privacy policy is awaiting legal review and will be published before launch.',
        eyebrow: 'Legal',
        introduction:
          'The privacy policy is still being prepared. We will publish reviewed copy here before any public launch or data collection through this website.',
        notice: 'No website waitlist or analytics is active.',
        noIndex: true,
      },
      terms: {
        title: 'Terms of service',
        description:
          'Unumae’s terms of service are awaiting legal review and will be published before launch.',
        eyebrow: 'Legal',
        introduction:
          'The terms of service are still being prepared. We will publish reviewed copy here before the product becomes publicly available.',
        notice: 'This placeholder is not a legal agreement.',
        noIndex: true,
      },
    },
    facts: [
      { value: '1', label: 'Human per day' },
      { value: '24h', label: 'One global window' },
      { value: '0', label: 'Followers or rankings' },
    ],
    footerStatement: 'Meet one person. Come back tomorrow.',
  },
  fr: {
    languageName: 'Français',
    skipToContent: 'Aller au contenu',
    navigationLabel: 'Navigation principale',
    languageLabel: 'Langue',
    homeLabel: 'Accueil Unumae',
    comingSoon: 'Bientôt sur iPhone',
    navigation: {
      today: 'Aujourd’hui',
      about: 'À propos',
      'how-selection-works': 'Comment fonctionne la sélection',
      archive: 'Les Archives',
      'community-guidelines': 'Règles de la communauté',
      privacy: 'Confidentialité',
      terms: 'Conditions',
    },
    pages: {
      home: {
        title: '8 milliards de personnes. Une aujourd’hui.',
        description:
          'Chaque jour, une personne ordinaire devient l’Humain du jour. Découvrez son histoire pendant 24 heures et retrouvez-la dans les Archives humaines.',
        eyebrow: 'Unumae',
        introduction:
          'Chaque jour, une personne ordinaire de la communauté devient l’Humain du jour. Le monde découvre son histoire pendant 24 heures, lui pose des questions et s’en souvient dans les Archives humaines.',
      },
      today: {
        title: 'L’Humain du jour',
        description:
          'La page publique de l’Humain du jour, compréhensible depuis un lien partagé sans installer l’application.',
        eyebrow: 'Aujourd’hui',
        introduction:
          'Au lancement d’Unumae, le monde rencontrera ici une personne pendant une même fenêtre mondiale de 24 heures. Chaque histoire restera ouverte aux visiteurs.',
        notice:
          'Aucun Humain public pour le moment. Unumae prépare son lancement.',
      },
      about: {
        title: 'Voir vraiment une personne.',
        description:
          'Pourquoi Unumae présente chaque jour une personne ordinaire au monde—et choisit de s’arrêter là.',
        eyebrow: 'À propos d’Unumae',
        introduction:
          'Unumae repose sur une attention limitée : une personne, un jour, une histoire finie. Aucun follower, classement ou fil infini ne lui fait concurrence.',
      },
      'how-selection-works': {
        title: 'Une chance égale est vraiment égale.',
        description:
          'Comment Unumae fige le groupe éligible, enregistre le tirage quotidien et exclut paiement, célébrité et engagement de la sélection.',
        eyebrow: 'Comment fonctionne la sélection',
        introduction:
          'Deux jours avant chaque cycle, le groupe éligible est figé. Une graine sécurisée ordonne une personne principale et trois remplaçants. Le résultat est enregistré et reproductible.',
      },
      archive: {
        title: 'Toutes les personnes rencontrées par le monde.',
        description:
          'Les Archives humaines se parcourent par date, pays, année ou au hasard—jamais par popularité.',
        eyebrow: 'Les Archives',
        introduction:
          'Après sa journée, chaque Humain rejoint une séquence permanente. Une personne peut demander à partir ; seuls son numéro et la date restent comme trace neutre.',
        notice: 'Les Archives commenceront avec le premier Humain publié.',
      },
      'community-guidelines': {
        title: 'Respecter la personne en face.',
        description:
          'Les règles publiques qui protègent l’Humain du jour de la compétition, de la promotion et du harcèlement.',
        eyebrow: 'Règles de la communauté',
        introduction:
          'Posez la question que vous poseriez à une personne inconnue que vous respectez. Les questions sont bienvenues ; les verdicts, la promotion, le harcèlement et le contact privé ne le sont pas.',
        notice:
          'Les règles approuvées complètes seront publiées ici pendant la phase consacrée à la confiance.',
      },
      privacy: {
        title: 'Politique de confidentialité',
        description:
          'La politique de confidentialité d’Unumae attend une validation juridique et sera publiée avant le lancement.',
        eyebrow: 'Juridique',
        introduction:
          'La politique de confidentialité est en préparation. Un texte validé sera publié ici avant tout lancement public ou collecte de données sur ce site.',
        notice:
          'Aucune liste d’attente ni mesure d’audience n’est active sur ce site.',
        noIndex: true,
      },
      terms: {
        title: 'Conditions d’utilisation',
        description:
          'Les conditions d’utilisation d’Unumae attendent une validation juridique et seront publiées avant le lancement.',
        eyebrow: 'Juridique',
        introduction:
          'Les conditions d’utilisation sont en préparation. Un texte validé sera publié ici avant la mise à disposition publique du produit.',
        notice: 'Cette page temporaire ne constitue pas un accord juridique.',
        noIndex: true,
      },
    },
    facts: [
      { value: '1', label: 'Humain par jour' },
      { value: '24 h', label: 'Une fenêtre mondiale' },
      { value: '0', label: 'Followers ou classements' },
    ],
    footerStatement: 'Rencontrez une personne. Revenez demain.',
  },
  de: {
    languageName: 'Deutsch',
    skipToContent: 'Zum Inhalt springen',
    navigationLabel: 'Hauptnavigation',
    languageLabel: 'Sprache',
    homeLabel: 'Unumae-Startseite',
    comingSoon: 'Demnächst fürs iPhone',
    navigation: {
      today: 'Heute',
      about: 'Über uns',
      'how-selection-works': 'So funktioniert die Auswahl',
      archive: 'Das Archiv',
      'community-guidelines': 'Community-Regeln',
      privacy: 'Datenschutz',
      terms: 'Bedingungen',
    },
    pages: {
      home: {
        title: '8 Milliarden Menschen. Heute einer.',
        description:
          'Jeden Tag wird ein gewöhnlicher Mensch zum Menschen des Tages. Entdecke seine Geschichte 24 Stunden lang und erinnere dich im Menschenarchiv.',
        eyebrow: 'Unumae',
        introduction:
          'Jeden Tag wird ein gewöhnlicher Mensch aus der Community zum Menschen des Tages. Die Welt entdeckt 24 Stunden lang seine Geschichte, stellt Fragen und erinnert sich im Menschenarchiv.',
      },
      today: {
        title: 'Der Mensch des Tages',
        description:
          'Die öffentliche Seite des Menschen des Tages—verständlich über einen geteilten Link, ohne die App zu installieren.',
        eyebrow: 'Heute',
        introduction:
          'Nach dem Start von Unumae begegnet die Welt hier einem Menschen in einem gemeinsamen globalen 24-Stunden-Fenster. Jede Geschichte bleibt für Gäste offen.',
        notice:
          'Noch ist kein öffentlicher Mensch live. Unumae bereitet den Start vor.',
      },
      about: {
        title: 'Einen Menschen wirklich sehen.',
        description:
          'Warum Unumae jeden Tag einen gewöhnlichen Menschen vorstellt—und bewusst dort aufhört.',
        eyebrow: 'Über Unumae',
        introduction:
          'Unumae gibt Aufmerksamkeit klare Grenzen: ein Mensch, ein Tag, eine endliche Geschichte. Keine Follower, Ranglisten oder endlosen Feeds konkurrieren mit dieser Person.',
      },
      'how-selection-works': {
        title: 'Gleiche Chance heißt wirklich gleich.',
        description:
          'Wie Unumae den berechtigten Pool einfriert, die tägliche Ziehung aufzeichnet und Geld, Ruhm und Engagement aus der Auswahl heraushält.',
        eyebrow: 'So funktioniert die Auswahl',
        introduction:
          'Zwei Tage vor jedem Zyklus wird der berechtigte Pool eingefroren. Ein sicherer Seed ordnet eine Hauptperson und drei Ersatzpersonen. Das Ergebnis wird aufgezeichnet und ist reproduzierbar.',
      },
      archive: {
        title: 'Alle Menschen, denen die Welt begegnet ist.',
        description:
          'Das Menschenarchiv lässt sich nach Zeit, Land, Jahr oder zufällig erkunden—niemals nach Beliebtheit.',
        eyebrow: 'Das Archiv',
        introduction:
          'Nach dem Live-Tag wird jeder Mensch Teil einer dauerhaften Reihenfolge. Die Person kann weiterhin um Entfernung bitten; nur Nummer und Datum bleiben als neutraler Platzhalter.',
        notice: 'Das Archiv beginnt mit dem ersten veröffentlichten Menschen.',
      },
      'community-guidelines': {
        title: 'Behandle Fremde mit Respekt.',
        description:
          'Die öffentlichen Regeln, die den Menschen des Tages vor Wettbewerb, Werbung und Belästigung schützen.',
        eyebrow: 'Community-Regeln',
        introduction:
          'Frage, was du eine fremde Person fragen würdest, die du respektierst. Fragen sind willkommen; Urteile, Werbung, Belästigung und private Kontaktversuche nicht.',
        notice:
          'Die vollständigen beschlossenen Regeln werden in der Phase für Vertrauensseiten hier veröffentlicht.',
      },
      privacy: {
        title: 'Datenschutzerklärung',
        description:
          'Unumaes Datenschutzerklärung wartet auf die rechtliche Prüfung und wird vor dem Start veröffentlicht.',
        eyebrow: 'Rechtliches',
        introduction:
          'Die Datenschutzerklärung wird noch vorbereitet. Geprüfter Text erscheint hier vor jedem öffentlichen Start oder jeder Datenerhebung über diese Website.',
        notice: 'Auf dieser Website sind weder Warteliste noch Analysen aktiv.',
        noIndex: true,
      },
      terms: {
        title: 'Nutzungsbedingungen',
        description:
          'Unumaes Nutzungsbedingungen warten auf die rechtliche Prüfung und werden vor dem Start veröffentlicht.',
        eyebrow: 'Rechtliches',
        introduction:
          'Die Nutzungsbedingungen werden noch vorbereitet. Geprüfter Text erscheint hier, bevor das Produkt öffentlich verfügbar wird.',
        notice: 'Dieser Platzhalter ist keine rechtliche Vereinbarung.',
        noIndex: true,
      },
    },
    facts: [
      { value: '1', label: 'Mensch pro Tag' },
      { value: '24 Std.', label: 'Ein globales Zeitfenster' },
      { value: '0', label: 'Follower oder Ranglisten' },
    ],
    footerStatement: 'Begegne einem Menschen. Komm morgen wieder.',
  },
};

export function localizedPath(locale: Locale, page: RouteKey): string {
  const prefix = locale === 'en' ? '' : `/${locale}`;
  return page === 'home' ? prefix || '/' : `${prefix}/${page}`;
}
