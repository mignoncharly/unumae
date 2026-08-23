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
      remainingLabel: string;
      portraitLabel: string;
      questionsTitle: string;
      noQuestions: string;
      unanswered: string;
      guestNote: string;
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
    };
  };
}

export const publicContent: Record<Locale, PublicCopy> = {
  en: {
    today: {
      hero: {
        eyebrow: 'Today · One global window',
        title: 'Today’s Human',
        introduction:
          'One person, open to everyone for the same 24 hours. A shared link works here without an account or app installation.',
      },
      launch: {
        eyebrow: 'Preparing for launch',
        title: 'There is no public Human yet.',
        body: 'Unumae will only show a real person here after they have accepted, completed their portrait, and passed review. Until then, this page stays honest and still.',
      },
      loading: {
        eyebrow: 'Today',
        title: 'Looking for today’s story…',
        body: 'Only approved public information is being requested.',
      },
      quiet: {
        eyebrow: 'Quiet Day',
        title: 'No Human is being published today.',
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
        humanLabel: 'Human',
        remainingLabel: 'Remaining in this UTC day',
        portraitLabel: 'Their portrait',
        questionsTitle: 'Questions from the world',
        noQuestions: 'No approved questions yet.',
        unanswered: 'Not answered yet',
        guestNote:
          'This public story is open to guests. No popularity or Remember total is shown.',
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
        eyebrow: 'The Human Archive',
        title: 'Everyone the world has met.',
        introduction:
          'A chronological record of each published day. Explore by time, country, year, or chance—never by popularity.',
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
          body: 'A Human may remove their story; only their number and date remain.',
        },
      ],
      launch: {
        eyebrow: 'Preparing for launch',
        title: 'The Archive begins with Human #0001.',
        body: 'No demo people have been added. The first entry will appear only after a real, consented Human completes their live day.',
      },
      loading: {
        eyebrow: 'The Archive',
        title: 'Opening the record…',
        body: 'Only published entries from the anonymous public reader are being requested.',
      },
      empty: {
        eyebrow: 'The beginning',
        title: 'The Archive is still empty.',
        body: 'It begins with Human #0001 after the first approved live day.',
      },
      noMatch: {
        eyebrow: 'No match',
        title: 'Nobody here yet.',
        body: 'No Human matches those filters. Try another country or year.',
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
        random: 'Random Human',
        chronological: 'Newest first',
        randomResult: 'Found at random',
        loadMore: 'Show the next 12',
        end: 'You have reached the end.',
      },
      entry: {
        humanLabel: 'Human',
        removed: 'This Human asked to be removed.',
        removedBody:
          'Their number and date stay so the Archive remains a complete sequence. Their identity and story do not.',
        photoAlt: 'Portrait of',
      },
    },
  },
  fr: {
    today: {
      hero: {
        eyebrow: 'Aujourd’hui · Une fenêtre mondiale',
        title: 'L’Humain du jour',
        introduction:
          'Une personne, ouverte à tout le monde pendant les mêmes 24 heures. Un lien partagé fonctionne ici sans compte ni installation.',
      },
      launch: {
        eyebrow: 'Préparation du lancement',
        title: 'Aucun Humain public pour le moment.',
        body: 'Unumae ne montrera ici qu’une personne réelle, après son acceptation, son portrait et sa validation. Jusque-là, cette page reste honnête et calme.',
      },
      loading: {
        eyebrow: 'Aujourd’hui',
        title: 'Recherche de l’histoire du jour…',
        body: 'Seules les informations publiques approuvées sont demandées.',
      },
      quiet: {
        eyebrow: 'Jour calme',
        title: 'Aucun Humain n’est publié aujourd’hui.',
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
        humanLabel: 'Humain',
        remainingLabel: 'Temps restant dans cette journée UTC',
        portraitLabel: 'Son portrait',
        questionsTitle: 'Questions du monde',
        noQuestions: 'Aucune question approuvée pour le moment.',
        unanswered: 'Pas encore de réponse',
        guestNote:
          'Cette histoire publique est ouverte aux visiteurs. Aucun total de popularité ou de Remember n’est affiché.',
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
        eyebrow: 'Les Archives humaines',
        title: 'Toutes les personnes rencontrées par le monde.',
        introduction:
          'La trace chronologique de chaque journée publiée. À parcourir par date, pays, année ou au hasard—jamais par popularité.',
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
          body: 'Un Humain peut retirer son histoire ; seuls son numéro et la date restent.',
        },
      ],
      launch: {
        eyebrow: 'Préparation du lancement',
        title: 'Les Archives commencent avec l’Humain #0001.',
        body: 'Aucune personne de démonstration n’a été ajoutée. La première entrée apparaîtra après la journée d’un Humain réel et consentant.',
      },
      loading: {
        eyebrow: 'Les Archives',
        title: 'Ouverture du registre…',
        body: 'Seules les entrées publiées par le lecteur public anonyme sont demandées.',
      },
      empty: {
        eyebrow: 'Le commencement',
        title: 'Les Archives sont encore vides.',
        body: 'Elles commencent avec l’Humain #0001 après la première journée approuvée.',
      },
      noMatch: {
        eyebrow: 'Aucun résultat',
        title: 'Personne ici pour le moment.',
        body: 'Aucun Humain ne correspond à ces filtres. Essayez un autre pays ou une autre année.',
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
        random: 'Humain au hasard',
        chronological: 'Du plus récent au plus ancien',
        randomResult: 'Trouvé au hasard',
        loadMore: 'Afficher les 12 suivants',
        end: 'Vous avez atteint la fin.',
      },
      entry: {
        humanLabel: 'Humain',
        removed: 'Cet Humain a demandé à être retiré.',
        removedBody:
          'Son numéro et la date restent pour préserver la séquence. Son identité et son histoire disparaissent.',
        photoAlt: 'Portrait de',
      },
    },
  },
  de: {
    today: {
      hero: {
        eyebrow: 'Heute · Ein globales Zeitfenster',
        title: 'Der Mensch des Tages',
        introduction:
          'Ein Mensch, für alle in denselben 24 Stunden offen. Ein geteilter Link funktioniert hier ohne Konto oder App-Installation.',
      },
      launch: {
        eyebrow: 'Vorbereitung auf den Start',
        title: 'Noch ist kein öffentlicher Mensch zu sehen.',
        body: 'Unumae zeigt hier erst eine reale Person, nachdem sie zugesagt, ihr Porträt erstellt und die Prüfung bestanden hat. Bis dahin bleibt diese Seite ehrlich und still.',
      },
      loading: {
        eyebrow: 'Heute',
        title: 'Die heutige Geschichte wird gesucht…',
        body: 'Nur freigegebene öffentliche Informationen werden angefragt.',
      },
      quiet: {
        eyebrow: 'Stiller Tag',
        title: 'Heute wird kein Mensch veröffentlicht.',
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
        humanLabel: 'Mensch',
        remainingLabel: 'Verbleibend in diesem UTC-Tag',
        portraitLabel: 'Das Porträt',
        questionsTitle: 'Fragen aus der Welt',
        noQuestions: 'Noch keine freigegebenen Fragen.',
        unanswered: 'Noch nicht beantwortet',
        guestNote:
          'Diese öffentliche Geschichte ist für Gäste offen. Beliebtheits- oder Remember-Zahlen werden nicht gezeigt.',
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
        eyebrow: 'Das Menschenarchiv',
        title: 'Alle Menschen, denen die Welt begegnet ist.',
        introduction:
          'Die chronologische Aufzeichnung jedes veröffentlichten Tages. Nach Zeit, Land, Jahr oder Zufall—niemals nach Beliebtheit.',
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
          body: 'Ein Mensch kann seine Geschichte entfernen; nur Nummer und Datum bleiben.',
        },
      ],
      launch: {
        eyebrow: 'Vorbereitung auf den Start',
        title: 'Das Archiv beginnt mit Mensch #0001.',
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
        body: 'Es beginnt nach dem ersten freigegebenen Live-Tag mit Mensch #0001.',
      },
      noMatch: {
        eyebrow: 'Kein Treffer',
        title: 'Hier ist noch niemand.',
        body: 'Kein Mensch entspricht diesen Filtern. Probiere ein anderes Land oder Jahr.',
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
        random: 'Zufälliger Mensch',
        chronological: 'Das Neueste zuerst',
        randomResult: 'Zufällig gefunden',
        loadMore: 'Die nächsten 12 zeigen',
        end: 'Du hast das Ende erreicht.',
      },
      entry: {
        humanLabel: 'Mensch',
        removed: 'Dieser Mensch bat um Entfernung.',
        removedBody:
          'Nummer und Datum bleiben für die vollständige Reihenfolge. Identität und Geschichte nicht.',
        photoAlt: 'Porträt von',
      },
    },
  },
};
