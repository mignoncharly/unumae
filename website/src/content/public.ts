import type { Locale } from './site';

export const publicPageKeys = ['today', 'archive'] as const;
export type PublicPageKey = (typeof publicPageKeys)[number];

export const portraitKeys = [
  'introduction',
  'where_im_from',
  'today_i_feel',
  'something_i_love',
  'something_misunderstood',
  'ordinary_moment',
  'something_id_tell_the_world',
] as const;

export type PortraitKey = (typeof portraitKeys)[number];

interface StateCopy {
  eyebrow: string;
  title: string;
  body: string;
}

interface PublicCopy {
  today: {
    hero: { eyebrow: string; title: string; introduction: string };
    launch: StateCopy;
    loading: StateCopy;
    quiet: StateCopy & { archiveLink: string };
    error: StateCopy & { retry: string };
    live: {
      liveLabel: string;
      humanLabel: string;
      foundingLabel: string;
      remainingLabel: string;
      portraitLabel: string;
      questionsTitle: string;
      noQuestions: string;
      unanswered: string;
      guestNote: string;
      showTranslated: string;
      showOriginal: string;
      translated: string;
      prompts: Record<PortraitKey, string>;
    };
  };
  archive: {
    hero: { eyebrow: string; title: string; introduction: string };
    principles: readonly { title: string; body: string }[];
    launch: StateCopy;
    loading: StateCopy;
    empty: StateCopy;
    noMatch: StateCopy;
    error: StateCopy & { retry: string };
    controls: {
      label: string;
      country: string;
      year: string;
      everywhere: string;
      allYears: string;
      random: string;
      chronological: string;
      randomResult: string;
      loadMore: string;
      end: string;
    };
    entry: {
      humanLabel: string;
      removed: string;
      removedBody: string;
      photoAlt: string;
      editorialFallback: string;
    };
  };
}

export const publicContent: Record<Locale, PublicCopy> = {
  en: {
    today: {
      hero: {
        eyebrow: 'Today · One global window',
        title: 'Today',
        introduction:
          'Today opens the current daily Journey to everyone for the same 24 hours. A shared link works here without an account or app installation.',
      },
      launch: {
        eyebrow: 'Preparing for launch',
        title: 'There is no public Journey yet.',
        body: 'Unumae will only show a real Journey here after the Chosen One has accepted, completed their portrait, and passed review. Until then, this page stays honest and still.',
      },
      loading: {
        eyebrow: 'Today',
        title: 'Looking for today’s story…',
        body: 'Only approved public information is being requested.',
      },
      quiet: {
        eyebrow: 'Quiet Day',
        title: 'No Journey is being published today.',
        body: 'Sometimes the careful answer is nobody: no person accepted and passed review in time. Unumae never fills the space with an invented or unreviewed story.',
        archiveLink: 'Meet someone from the Archive',
      },
      error: {
        eyebrow: 'Connection interrupted',
        title: 'Today’s story could not be reached.',
        body: 'Nothing partial or unverified will be shown. Check the connection and try again.',
        retry: 'Try again',
      },
      live: {
        liveLabel: 'Live worldwide',
        humanLabel: 'Chosen One',
        foundingLabel: 'Joined during Year Zero',
        remainingLabel: 'Remaining in this UTC day',
        portraitLabel: 'Their portrait',
        questionsTitle: 'Questions from the world',
        noQuestions: 'No approved questions yet.',
        unanswered: 'Not answered yet',
        guestNote:
          'This public story is open to guests. No popularity or Remember total is shown.',
        showTranslated: 'Read a translation',
        showOriginal: 'Read the original',
        translated: 'Translated. The original remains one tap away.',
        prompts: {
          introduction: 'Introduction',
          where_im_from: 'Where I’m from',
          today_i_feel: 'Today I feel',
          something_i_love: 'Something I love',
          something_misunderstood: 'Something people misunderstand',
          ordinary_moment: 'An ordinary moment I treasure',
          something_id_tell_the_world: 'Something I’d tell the world',
        },
      },
    },
    archive: {
      hero: {
        eyebrow: 'The Archive',
        title: 'Everyone the world has met.',
        introduction:
          'A chronological record of each completed Journey. Explore by time, country, year, or chance—never by popularity.',
      },
      principles: [
        {
          title: 'Chronological',
          body: 'Newest first, with a visible end. No algorithmic ordering.',
        },
        {
          title: 'Open to guests',
          body: 'The core Archive never requires an account or payment.',
        },
        {
          title: 'Removal is real',
          body: 'A Chosen One may ask to remove their Journey; only its number and date remain.',
        },
      ],
      launch: {
        eyebrow: 'Preparing for launch',
        title: 'The Archive begins with Journey #0001.',
        body: 'No demo people have been added. The first entry will appear only after a real, consenting Chosen One completes their Journey.',
      },
      loading: {
        eyebrow: 'The Archive',
        title: 'Opening the record…',
        body: 'Only published entries from the anonymous public reader are being requested.',
      },
      empty: {
        eyebrow: 'The beginning',
        title: 'The Archive is still empty.',
        body: 'It begins with Journey #0001 after the first approved live day.',
      },
      noMatch: {
        eyebrow: 'No match',
        title: 'Nobody here yet.',
        body: 'No Journey matches those filters. Try another country or year.',
      },
      error: {
        eyebrow: 'Connection interrupted',
        title: 'The Archive could not be reached.',
        body: 'No incomplete entry will be shown. Check the connection and try again.',
        retry: 'Try again',
      },
      controls: {
        label: 'Explore the Archive',
        country: 'Country',
        year: 'Year',
        everywhere: 'Everywhere',
        allYears: 'All years',
        random: 'Random Journey',
        chronological: 'Newest first',
        randomResult: 'Found at random',
        loadMore: 'Show the next 12',
        end: 'You have reached the end.',
      },
      entry: {
        humanLabel: 'Chosen One',
        removed: 'This Journey was removed at the Chosen One’s request.',
        removedBody:
          'Its number and date remain so the Archive keeps a complete sequence. The Chosen One’s identity and story do not.',
        photoAlt: 'Portrait of',
        editorialFallback: 'Editorial image · Portrait unavailable',
      },
    },
  },
  fr: {
    today: {
      hero: {
        eyebrow: 'Aujourd’hui · Une fenêtre mondiale',
        title: 'Aujourd’hui',
        introduction:
          'Aujourd’hui ouvre la Journey du jour à tout le monde pendant les mêmes 24 heures. Un lien partagé fonctionne ici sans compte ni installation.',
      },
      launch: {
        eyebrow: 'Préparation du lancement',
        title: 'Aucune Journey publique pour le moment.',
        body: 'Unumae ne montrera ici qu’une Journey réelle, après l’accord de l’Élu·e, son portrait et sa validation. Jusque-là, cette page reste honnête et calme.',
      },
      loading: {
        eyebrow: 'Aujourd’hui',
        title: 'Recherche de l’histoire du jour…',
        body: 'Seules les informations publiques approuvées sont demandées.',
      },
      quiet: {
        eyebrow: 'Jour calme',
        title: 'Aucune Journey n’est publiée aujourd’hui.',
        body: 'Parfois, la réponse la plus soigneuse est personne : personne n’a accepté et passé la modération à temps. Unumae ne comble jamais cet espace avec une histoire inventée ou non relue.',
        archiveLink: 'Rencontrer quelqu’un dans les Archives',
      },
      error: {
        eyebrow: 'Connexion interrompue',
        title: 'L’histoire du jour est inaccessible.',
        body: 'Aucun contenu partiel ou non vérifié ne sera affiché. Vérifiez la connexion et réessayez.',
        retry: 'Réessayer',
      },
      live: {
        liveLabel: 'En direct dans le monde',
        humanLabel: 'Élu·e',
        foundingLabel: 'Arrivé pendant l’Année Zéro',
        remainingLabel: 'Temps restant dans cette journée UTC',
        portraitLabel: 'Son portrait',
        questionsTitle: 'Questions du monde',
        noQuestions: 'Aucune question approuvée pour le moment.',
        unanswered: 'Pas encore de réponse',
        guestNote:
          'Cette histoire publique est ouverte aux visiteurs. Aucun total de popularité ou de Remember n’est affiché.',
        showTranslated: 'Lire une traduction',
        showOriginal: 'Lire l’original',
        translated: 'Traduit. L’original reste accessible en un geste.',
        prompts: {
          introduction: 'Présentation',
          where_im_from: 'D’où je viens',
          today_i_feel: 'Aujourd’hui, je me sens',
          something_i_love: 'Quelque chose que j’aime',
          something_misunderstood:
            'Quelque chose que les autres comprennent mal',
          ordinary_moment: 'Un moment ordinaire qui m’est précieux',
          something_id_tell_the_world: 'Quelque chose que je dirais au monde',
        },
      },
    },
    archive: {
      hero: {
        eyebrow: 'Les Archives',
        title: 'Toutes les personnes rencontrées par le monde.',
        introduction:
          'La trace chronologique de chaque Journey terminée. À parcourir par date, pays, année ou au hasard—jamais par popularité.',
      },
      principles: [
        {
          title: 'Chronologique',
          body: 'Du plus récent au plus ancien, avec une vraie fin. Aucun ordre algorithmique.',
        },
        {
          title: 'Ouvert aux visiteurs',
          body: 'Le cœur des Archives ne demande jamais de compte ni de paiement.',
        },
        {
          title: 'Le retrait est réel',
          body: 'L’Élu·e peut demander le retrait de sa Journey ; seuls son numéro et la date restent.',
        },
      ],
      launch: {
        eyebrow: 'Préparation du lancement',
        title: 'Les Archives commencent avec la Journey #0001.',
        body: 'Aucune personne de démonstration n’a été ajoutée. La première entrée apparaîtra après la Journey d’un·e Élu·e réel·le et consentant·e.',
      },
      loading: {
        eyebrow: 'Les Archives',
        title: 'Ouverture du registre…',
        body: 'Seules les entrées publiées par le lecteur public anonyme sont demandées.',
      },
      empty: {
        eyebrow: 'Le commencement',
        title: 'Les Archives sont encore vides.',
        body: 'Elles commencent avec la Journey #0001 après la première journée approuvée.',
      },
      noMatch: {
        eyebrow: 'Aucun résultat',
        title: 'Personne ici pour le moment.',
        body: 'Aucune Journey ne correspond à ces filtres. Essayez un autre pays ou une autre année.',
      },
      error: {
        eyebrow: 'Connexion interrompue',
        title: 'Les Archives sont inaccessibles.',
        body: 'Aucune entrée incomplète ne sera affichée. Vérifiez la connexion et réessayez.',
        retry: 'Réessayer',
      },
      controls: {
        label: 'Explorer les Archives',
        country: 'Pays',
        year: 'Année',
        everywhere: 'Partout',
        allYears: 'Toutes les années',
        random: 'Journey au hasard',
        chronological: 'Du plus récent au plus ancien',
        randomResult: 'Trouvé au hasard',
        loadMore: 'Afficher les 12 suivants',
        end: 'Vous avez atteint la fin.',
      },
      entry: {
        humanLabel: 'Élu·e',
        removed: 'Cette Journey a été retirée à la demande de l’Élu·e.',
        removedBody:
          'Son numéro et la date restent pour préserver la séquence. L’identité de l’Élu·e et son histoire disparaissent.',
        photoAlt: 'Portrait de',
        editorialFallback: 'Image éditoriale · Portrait indisponible',
      },
    },
  },
  de: {
    today: {
      hero: {
        eyebrow: 'Heute · Ein globales Zeitfenster',
        title: 'Heute',
        introduction:
          'Heute öffnet die aktuelle Journey für alle in denselben 24 Stunden. Ein geteilter Link funktioniert hier ohne Konto oder App-Installation.',
      },
      launch: {
        eyebrow: 'Vorbereitung auf den Start',
        title: 'Noch ist keine öffentliche Journey zu sehen.',
        body: 'Unumae zeigt hier erst eine reale Journey, nachdem der Chosen One zugesagt, das Porträt erstellt und die Prüfung bestanden hat. Bis dahin bleibt diese Seite ehrlich und still.',
      },
      loading: {
        eyebrow: 'Heute',
        title: 'Die heutige Geschichte wird gesucht…',
        body: 'Nur freigegebene öffentliche Informationen werden angefragt.',
      },
      quiet: {
        eyebrow: 'Stiller Tag',
        title: 'Heute wird keine Journey veröffentlicht.',
        body: 'Manchmal ist niemand die sorgfältigste Antwort: Niemand hat rechtzeitig zugesagt und die Prüfung bestanden. Unumae füllt den Platz nie mit einer erfundenen oder ungeprüften Geschichte.',
        archiveLink: 'Jemandem aus dem Archiv begegnen',
      },
      error: {
        eyebrow: 'Verbindung unterbrochen',
        title: 'Die heutige Geschichte ist nicht erreichbar.',
        body: 'Nichts Unvollständiges oder Ungeprüftes wird gezeigt. Prüfe die Verbindung und versuche es erneut.',
        retry: 'Erneut versuchen',
      },
      live: {
        liveLabel: 'Weltweit live',
        humanLabel: 'Chosen One',
        foundingLabel: 'Im Jahr Null dazugekommen',
        remainingLabel: 'Verbleibend in diesem UTC-Tag',
        portraitLabel: 'Das Porträt',
        questionsTitle: 'Fragen aus der Welt',
        noQuestions: 'Noch keine freigegebenen Fragen.',
        unanswered: 'Noch nicht beantwortet',
        guestNote:
          'Diese öffentliche Geschichte ist für Gäste offen. Beliebtheits- oder Remember-Zahlen werden nicht gezeigt.',
        showTranslated: 'Übersetzung lesen',
        showOriginal: 'Original lesen',
        translated: 'Übersetzt. Das Original ist nur eine Berührung entfernt.',
        prompts: {
          introduction: 'Vorstellung',
          where_im_from: 'Woher ich komme',
          today_i_feel: 'Heute fühle ich mich',
          something_i_love: 'Etwas, das ich liebe',
          something_misunderstood: 'Etwas, das andere missverstehen',
          ordinary_moment: 'Ein gewöhnlicher Moment, der mir viel bedeutet',
          something_id_tell_the_world: 'Etwas, das ich der Welt sagen würde',
        },
      },
    },
    archive: {
      hero: {
        eyebrow: 'Das Archiv',
        title: 'Alle Menschen, denen die Welt begegnet ist.',
        introduction:
          'Die chronologische Aufzeichnung jeder abgeschlossenen Journey. Nach Zeit, Land, Jahr oder Zufall—niemals nach Beliebtheit.',
      },
      principles: [
        {
          title: 'Chronologisch',
          body: 'Das Neueste zuerst, mit einem sichtbaren Ende. Keine algorithmische Reihenfolge.',
        },
        {
          title: 'Für Gäste offen',
          body: 'Der Kern des Archivs verlangt nie ein Konto oder eine Zahlung.',
        },
        {
          title: 'Entfernung ist real',
          body: 'Der Chosen One kann seine Journey entfernen; nur Nummer und Datum bleiben.',
        },
      ],
      launch: {
        eyebrow: 'Vorbereitung auf den Start',
        title: 'Das Archiv beginnt mit Journey #0001.',
        body: 'Es wurden keine Demopersonen hinzugefügt. Der erste Eintrag erscheint erst nach dem Live-Tag eines realen, einwilligenden Menschen.',
      },
      loading: {
        eyebrow: 'Das Archiv',
        title: 'Die Aufzeichnung wird geöffnet…',
        body: 'Nur veröffentlichte Einträge aus dem anonymen öffentlichen Leser werden angefragt.',
      },
      empty: {
        eyebrow: 'Der Anfang',
        title: 'Das Archiv ist noch leer.',
        body: 'Es beginnt nach dem ersten freigegebenen Live-Tag mit Journey #0001.',
      },
      noMatch: {
        eyebrow: 'Kein Treffer',
        title: 'Hier ist noch niemand.',
        body: 'Keine Journey entspricht diesen Filtern. Probiere ein anderes Land oder Jahr.',
      },
      error: {
        eyebrow: 'Verbindung unterbrochen',
        title: 'Das Archiv ist nicht erreichbar.',
        body: 'Kein unvollständiger Eintrag wird gezeigt. Prüfe die Verbindung und versuche es erneut.',
        retry: 'Erneut versuchen',
      },
      controls: {
        label: 'Archiv erkunden',
        country: 'Land',
        year: 'Jahr',
        everywhere: 'Überall',
        allYears: 'Alle Jahre',
        random: 'Zufällige Journey',
        chronological: 'Das Neueste zuerst',
        randomResult: 'Zufällig gefunden',
        loadMore: 'Die nächsten 12 zeigen',
        end: 'Du hast das Ende erreicht.',
      },
      entry: {
        humanLabel: 'Chosen One',
        removed: 'Diese Journey wurde auf Wunsch des Chosen One entfernt.',
        removedBody:
          'Nummer und Datum bleiben für die vollständige Reihenfolge. Identität des Chosen One und Geschichte nicht.',
        photoAlt: 'Porträt von',
        editorialFallback: 'Redaktionelles Bild · Porträt nicht verfügbar',
      },
    },
  },
};
