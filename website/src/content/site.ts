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
  footerNavigationLabel: string;
  languageLabel: string;
  homeLabel: string;
  comingSoon: string;
  navigation: Record<PageKey, string>;
  pages: Record<RouteKey, PageCopy>;
  /** Rendered under long-form legal text. The date is substituted in. */
  lastUpdated: string;
  facts: readonly { value: string; label: string }[];
  footerStatement: string;
}

export const content: Record<Locale, SiteCopy> = {
  en: {
    languageName: 'English',
    lastUpdated: 'Last updated {date}.',
    skipToContent: 'Skip to content',
    navigationLabel: 'Primary navigation',
    footerNavigationLabel: 'More navigation',
    languageLabel: 'Language',
    homeLabel: 'Unumae home',
    comingSoon: 'Coming to iPhone',
    navigation: {
      today: 'Today',
      about: 'About',
      'how-selection-works': 'How it works',
      archive: 'Archive',
      'community-guidelines': 'Safety',
      privacy: 'Privacy',
      terms: 'Terms',
    },
    pages: {
      home: {
        title: 'The journey is yours. — Unumae',
        description:
          'Meet the Chosen One and see how one personal Journey unfolds through photos, words, questions, and moments that matter.',
        eyebrow: 'Unumae',
        introduction:
          'Every day, one ordinary person becomes the Chosen One. The world discovers their Journey for 24 hours, asks questions, and can return to it in the Archive.',
      },
      today: {
        title: 'Today',
        description:
          'The public home of today’s Chosen One and Journey, designed to make the story understandable without installing the app.',
        eyebrow: 'Today',
        introduction:
          'When Unumae launches, this is where the world will meet one person for one global 24-hour window. Every story will remain open to guests.',
        notice:
          'There is no public Journey yet. Unumae is preparing for launch.',
      },
      about: {
        title: 'One person, seen properly.',
        description:
          'Why Unumae introduces one ordinary person to the world each day, then gives future Journeys room to unfold without turning attention into status.',
        eyebrow: 'About Unumae',
        introduction:
          'Unumae is built around attention with limits: one person, one day, one finite story. There are no public popularity counts, rankings, or an endless global feed competing with them. Journey connections, when introduced, will belong to a Journey rather than a person.',
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
          'The Archive is a chronological record of completed Journeys, explored by time, country, year, or at random—never by popularity.',
        eyebrow: 'The Archive',
        introduction:
          'After a Journey ends, it remains in a permanent sequence. The Chosen One can still ask to leave; only its number and date remain as a quiet marker.',
        notice: 'The Archive begins when the first Journey ends.',
      },
      'community-guidelines': {
        title: 'Treat a stranger with respect.',
        description:
          'The public rules that protect the Chosen One and keep Unumae free from competition, promotion, and harassment.',
        eyebrow: 'Community guidelines',
        introduction:
          'Ask what you would ask a stranger you respected. Questions are welcome; verdicts, promotion, harassment, and attempts at private contact are not.',
      },
      privacy: {
        title: 'Privacy policy',
        description:
          'How Unumae handles profiles, portraits, product analytics, and Archive data—and the controls every person keeps.',
        eyebrow: 'Legal',
        introduction:
          'A plain-language account of what Unumae collects, what becomes public, how long information is kept, and the choices every person retains.',
      },
      terms: {
        title: 'Terms of service',
        description:
          'The terms for using Unumae, owning your content, consenting to publication, and leaving the service.',
        eyebrow: 'Legal',
        introduction:
          'The rules for accounts, content ownership, publication permission, moderation, availability, and ending your use of Unumae.',
      },
    },
    facts: [
      { value: '1', label: 'Chosen One per day' },
      { value: '24h', label: 'One global window' },
      { value: '0', label: 'Public popularity counts' },
    ],
    footerStatement: 'Meet one person. Come back tomorrow.',
  },
  fr: {
    languageName: 'Français',
    lastUpdated: 'Dernière mise à jour : {date}.',
    skipToContent: 'Aller au contenu',
    navigationLabel: 'Navigation principale',
    footerNavigationLabel: 'Autres liens',
    languageLabel: 'Langue',
    homeLabel: 'Accueil Unumae',
    comingSoon: 'Bientôt sur iPhone',
    navigation: {
      today: 'Aujourd’hui',
      about: 'À propos',
      'how-selection-works': 'Comment ça marche',
      archive: 'Les Archives',
      'community-guidelines': 'Sécurité',
      privacy: 'Confidentialité',
      terms: 'Conditions',
    },
    pages: {
      home: {
        title: 'Le voyage t’appartient. — Unumae',
        description:
          'Rencontrez l’Élu·e et découvrez comment une Journey personnelle se déploie à travers photos, mots, questions et moments qui comptent.',
        eyebrow: 'Unumae',
        introduction:
          'Chaque jour, une personne ordinaire devient l’Élu·e. Le monde découvre sa Journey pendant 24 heures, lui pose des questions et peut la retrouver dans les Archives.',
      },
      today: {
        title: 'Aujourd’hui',
        description:
          'La page publique de l’Élu·e et de sa Journey du jour, compréhensible depuis un lien partagé sans installer l’application.',
        eyebrow: 'Aujourd’hui',
        introduction:
          'Au lancement d’Unumae, le monde rencontrera ici une personne pendant une même fenêtre mondiale de 24 heures. Chaque histoire restera ouverte aux visiteurs.',
        notice:
          'Aucune Journey publique pour le moment. Unumae prépare son lancement.',
      },
      about: {
        title: 'Voir vraiment une personne.',
        description:
          'Pourquoi Unumae présente chaque jour une personne ordinaire au monde—et choisit de s’arrêter là.',
        eyebrow: 'À propos d’Unumae',
        introduction:
          'Unumae repose sur une attention limitée : une personne, un jour, une histoire finie. Aucun compteur public de popularité, classement ou fil infini ne lui fait concurrence. Les liens futurs appartiendront à une Journey, pas au statut d’une personne.',
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
          'Les Archives rassemblent les Journeys terminées, par date, pays, année ou au hasard—jamais par popularité.',
        eyebrow: 'Les Archives',
        introduction:
          'Après sa journée, chaque Journey rejoint une séquence permanente. L’Élu·e peut demander son retrait ; seuls son numéro et la date restent comme trace neutre.',
        notice: 'Les Archives commenceront avec la première Journey terminée.',
      },
      'community-guidelines': {
        title: 'Respecter la personne en face.',
        description:
          'Les règles publiques qui protègent l’Élu·e de la compétition, de la promotion et du harcèlement.',
        eyebrow: 'Règles de la communauté',
        introduction:
          'Posez la question que vous poseriez à une personne inconnue que vous respectez. Les questions sont bienvenues ; les verdicts, la promotion, le harcèlement et le contact privé ne le sont pas.',
      },
      privacy: {
        title: 'Politique de confidentialité',
        description:
          'Comment Unumae traite les profils, portraits, données produit et Archives—et les choix conservés par chaque personne.',
        eyebrow: 'Juridique',
        introduction:
          'Une présentation claire des données recueillies, de ce qui devient public, de leur durée de conservation et des choix de chaque personne.',
      },
      terms: {
        title: 'Conditions d’utilisation',
        description:
          'Les conditions d’utilisation d’Unumae, de propriété des contenus, de consentement à la publication et de départ du service.',
        eyebrow: 'Juridique',
        introduction:
          'Les règles relatives aux comptes, aux contenus, à la publication, à la modération, à la disponibilité et à la fin d’utilisation d’Unumae.',
      },
    },
    facts: [
      { value: '1', label: 'Élu·e par jour' },
      { value: '24 h', label: 'Une fenêtre mondiale' },
      { value: '0', label: 'Compteurs publics de popularité' },
    ],
    footerStatement: 'Rencontrez une personne. Revenez demain.',
  },
  de: {
    languageName: 'Deutsch',
    lastUpdated: 'Zuletzt aktualisiert am {date}.',
    skipToContent: 'Zum Inhalt springen',
    navigationLabel: 'Hauptnavigation',
    footerNavigationLabel: 'Weitere Links',
    languageLabel: 'Sprache',
    homeLabel: 'Unumae-Startseite',
    comingSoon: 'Demnächst fürs iPhone',
    navigation: {
      today: 'Heute',
      about: 'Über uns',
      'how-selection-works': 'So funktioniert’s',
      archive: 'Das Archiv',
      'community-guidelines': 'Sicherheit',
      privacy: 'Datenschutz',
      terms: 'Bedingungen',
    },
    pages: {
      home: {
        title: 'Die Reise gehört dir. — Unumae',
        description:
          'Lerne den Chosen One kennen und entdecke, wie sich eine persönliche Journey durch Fotos, Worte, Fragen und bedeutungsvolle Momente entfaltet.',
        eyebrow: 'Unumae',
        introduction:
          'Jeden Tag wird ein gewöhnlicher Mensch zum Chosen One. Die Welt entdeckt 24 Stunden lang seine Journey, stellt Fragen und kann zu ihr ins Archiv zurückkehren.',
      },
      today: {
        title: 'Heute',
        description:
          'Die öffentliche Seite des heutigen Chosen One und seiner Journey—verständlich über einen geteilten Link, ohne die App zu installieren.',
        eyebrow: 'Heute',
        introduction:
          'Nach dem Start von Unumae begegnet die Welt hier einem Menschen in einem gemeinsamen globalen 24-Stunden-Fenster. Jede Geschichte bleibt für Gäste offen.',
        notice:
          'Noch ist keine öffentliche Journey live. Unumae bereitet den Start vor.',
      },
      about: {
        title: 'Einen Menschen wirklich sehen.',
        description:
          'Warum Unumae jeden Tag einen gewöhnlichen Menschen vorstellt—und bewusst dort aufhört.',
        eyebrow: 'Über Unumae',
        introduction:
          'Unumae gibt Aufmerksamkeit klare Grenzen: ein Mensch, ein Tag, eine endliche Geschichte. Keine öffentlichen Beliebtheitszahlen, Ranglisten oder endlosen Feeds konkurrieren mit dieser Person. Künftige Verbindungen gehören zu einer Journey, nicht zum Status einer Person.',
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
          'Das Archiv versammelt abgeschlossene Journeys, erkundbar nach Zeit, Land, Jahr oder Zufall—niemals nach Beliebtheit.',
        eyebrow: 'Das Archiv',
        introduction:
          'Nach dem Ende einer Journey bleibt sie Teil einer dauerhaften Reihenfolge. Der Chosen One kann weiterhin um Entfernung bitten; nur Nummer und Datum bleiben als neutraler Platzhalter.',
        notice: 'Das Archiv beginnt mit der ersten abgeschlossenen Journey.',
      },
      'community-guidelines': {
        title: 'Behandle Fremde mit Respekt.',
        description:
          'Die öffentlichen Regeln, die den Chosen One vor Wettbewerb, Werbung und Belästigung schützen.',
        eyebrow: 'Community-Regeln',
        introduction:
          'Frage, was du eine fremde Person fragen würdest, die du respektierst. Fragen sind willkommen; Urteile, Werbung, Belästigung und private Kontaktversuche nicht.',
      },
      privacy: {
        title: 'Datenschutzerklärung',
        description:
          'Wie Unumae Profile, Porträts, Produktdaten und das Archiv behandelt—und welche Entscheidungen jeder Mensch behält.',
        eyebrow: 'Rechtliches',
        introduction:
          'Eine klare Darstellung dessen, was Unumae erhebt, was öffentlich wird, wie lange Daten bleiben und welche Wahl jeder Mensch behält.',
      },
      terms: {
        title: 'Nutzungsbedingungen',
        description:
          'Die Bedingungen für die Nutzung von Unumae, eigene Inhalte, die Zustimmung zur Veröffentlichung und das Verlassen des Dienstes.',
        eyebrow: 'Rechtliches',
        introduction:
          'Die Regeln für Konten, Eigentum an Inhalten, Veröffentlichung, Moderation, Verfügbarkeit und das Beenden der Nutzung von Unumae.',
      },
    },
    facts: [
      { value: '1', label: 'Chosen One pro Tag' },
      { value: '24 Std.', label: 'Ein globales Zeitfenster' },
      { value: '0', label: 'Öffentliche Beliebtheitszahlen' },
    ],
    footerStatement: 'Begegne einem Menschen. Komm morgen wieder.',
  },
};

export function localizedPath(locale: Locale, page: RouteKey): string {
  const prefix = locale === 'en' ? '' : `/${locale}`;
  return page === 'home' ? prefix || '/' : `${prefix}/${page}`;
}
