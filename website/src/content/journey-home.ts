import type { Locale } from './site';

interface JourneyHomeCopy {
  hero: {
    eyebrow: string;
    firstLine: string;
    secondLine: string;
    introduction: string;
    primaryLink: string;
    selectionLink: string;
    launchState: string;
    previewLabel: string;
    previewAlt: string;
    previewMoment: string;
    previewCaption: string;
    previewNote: string;
  };
  path: readonly string[];
  experience: {
    eyebrow: string;
    title: string;
    body: string;
    previewLabel: string;
    previewNote: string;
    actions: readonly string[];
    moments: readonly {
      id: 'video' | 'photo' | 'text' | 'live';
      label: string;
      eyebrow: string;
      title: string;
      detail: string;
      caption: string;
    }[];
  };
  chosen: {
    eyebrow: string;
    title: string;
    body: string;
    roleLabel: string;
    roleTitle: string;
    roleBody: string;
    formatsLabel: string;
    formats: readonly string[];
    selectionLink: string;
  };
  participate: {
    eyebrow: string;
    title: string;
    body: string;
    items: readonly { number: string; title: string; body: string }[];
  };
  live: {
    eyebrow: string;
    title: string;
    body: string;
    futureLabel: string;
    visualTitle: string;
    visualBody: string;
    visualMeta: string;
  };
  safety: {
    eyebrow: string;
    title: string;
    body: string;
    principles: readonly { title: string; body: string }[];
    link: string;
  };
  closing: {
    eyebrow: string;
    title: string;
    body: string;
    primaryLink: string;
    secondaryLink: string;
    launchState: string;
  };
}

export const journeyHomeContent: Record<Locale, JourneyHomeCopy> = {
  en: {
    hero: {
      eyebrow: 'One person · one unfolding story',
      firstLine: 'The journey',
      secondLine: 'is yours.',
      introduction:
        'One person becomes the Chosen One. For one day, their world unfolds in moments—and everyone else gets to experience it with them.',
      primaryLink: 'Enter the journey',
      selectionLink: 'Why one person?',
      launchState: 'In development · coming to iPhone',
      previewLabel: 'Product direction preview',
      previewAlt:
        'A conceptual mobile view of a Chosen One sharing a photo moment from their journey.',
      previewMoment: 'Moment 03 · Photo',
      previewCaption: 'The quiet before everything starts.',
      previewNote: 'Editorial preview · no person shown',
    },
    path: ['Discover', 'Stay', 'Take part', 'Remember'],
    experience: {
      eyebrow: 'The experience',
      title: 'Not a feed. A point of view.',
      body: 'Move through one person’s day as they lived it: a clip, a thought, a photo, a pause. No pile-up of strangers competing for the next swipe.',
      previewLabel: 'Journey preview',
      previewNote:
        'Concept preview. The immersive stream and Live are not available in the current app yet.',
      actions: ['Ask', 'Remember', 'Share'],
      moments: [
        {
          id: 'video',
          label: 'Video',
          eyebrow: 'Moment 01 · 00:43 / 00:59',
          title: 'The train left before sunrise.',
          detail: 'Short video',
          caption: 'A moving moment, kept to under a minute.',
        },
        {
          id: 'photo',
          label: 'Photo',
          eyebrow: 'Moment 03 · 08:14',
          title: 'The quiet before everything starts.',
          detail: 'Photo',
          caption: 'One frame can hold the whole mood.',
        },
        {
          id: 'text',
          label: 'Text',
          eyebrow: 'Moment 06 · In their words',
          title: 'I thought I needed a plan. I needed a beginning.',
          detail: 'Text moment',
          caption: 'Room for the thoughts that do not need a camera.',
        },
        {
          id: 'live',
          label: 'Live',
          eyebrow: 'On the horizon · Live',
          title: 'Be there when it happens.',
          detail: 'Future direction',
          caption:
            'A shared moment, without turning a life into a performance.',
        },
      ],
    },
    chosen: {
      eyebrow: 'Meet the Chosen One',
      title: 'Their day. Their voice. Their call.',
      body: 'The Chosen One is simply the person whose journey the community holds space for today. They are selected fairly, invited—not obligated—and decide what becomes part of their story.',
      roleLabel: 'Today’s role',
      roleTitle: 'The Chosen One',
      roleBody:
        'One ordinary person gets the whole frame. Everyone else gets to meet them properly.',
      formatsLabel: 'A journey can hold',
      formats: [
        'Video · up to 59s',
        'Photo',
        'Text',
        'Voice',
        'Moments',
        'Milestones',
      ],
      selectionLink: 'See how selection works',
    },
    participate: {
      eyebrow: 'Show up, don’t perform',
      title: 'You are part of the journey. You are not the algorithm.',
      body: 'The people watching can lean in without taking over. The current app keeps participation small, human, and intentional.',
      items: [
        {
          number: '01',
          title: 'Ask something real',
          body: 'Questions create conversation. A vote can lift a thoughtful one—there is no downvote.',
        },
        {
          number: '02',
          title: 'Keep what moved you',
          body: 'Remember saves a person to your private library. The count never becomes a score.',
        },
        {
          number: '03',
          title: 'Pass it on',
          body: 'Share a journey because it meant something, not because a ranking told you to.',
        },
      ],
    },
    live: {
      eyebrow: 'Live, when it belongs',
      title: 'Be there when it happens.',
      body: 'Live belongs in a journey when the moment matters—not as an always-on demand to perform. It is part of the product direction, with safety and control designed first.',
      futureLabel: 'Future-facing preview',
      visualTitle: 'One moment. Shared now.',
      visualBody:
        'Conversation, reactions, and a replay-worthy memory—without a popularity scoreboard.',
      visualMeta: 'Live concept · not currently available',
    },
    safety: {
      eyebrow: 'Boundaries belong in the product',
      title: 'Your journey. Your boundaries.',
      body: 'Being chosen never means giving up control. The safeguards below are already part of Unumae’s current model.',
      principles: [
        {
          title: 'A real yes',
          body: 'Selection is an invitation. Declining carries no penalty, and nothing is published without explicit acceptance.',
        },
        {
          title: 'People before publishing',
          body: 'A person reviews every portrait before it appears. Reporting and moderation are built into the experience.',
        },
        {
          title: 'A way back out',
          body: 'People can delete their account and ask for their published story to leave the Archive.',
        },
      ],
      link: 'Read the community guidelines',
    },
    closing: {
      eyebrow: 'The next journey has not started yet',
      title: 'Come for the moments. Stay for the person.',
      body: 'Unumae is still in development. See the honest pre-launch space today, then come back as the journey takes shape.',
      primaryLink: 'See Today',
      secondaryLink: 'Why Unumae exists',
      launchState: 'Coming to iPhone · no waitlist yet',
    },
  },
  fr: {
    hero: {
      eyebrow: 'Une personne · une histoire qui se déroule',
      firstLine: 'Le voyage',
      secondLine: 't’appartient.',
      introduction:
        'Une personne devient l’Élu·e. Pendant une journée, son monde se dévoile en moments—et chacun peut le vivre à ses côtés.',
      primaryLink: 'Entrer dans le voyage',
      selectionLink: 'Pourquoi une personne ?',
      launchState: 'En développement · bientôt sur iPhone',
      previewLabel: 'Aperçu de la direction produit',
      previewAlt:
        'Vue mobile conceptuelle d’une photo partagée par l’Élu·e au fil de son voyage.',
      previewMoment: 'Moment 03 · Photo',
      previewCaption: 'Le calme avant que tout commence.',
      previewNote: 'Aperçu éditorial · personne non représentée',
    },
    path: ['Découvrir', 'Rester', 'Participer', 'Se souvenir'],
    experience: {
      eyebrow: 'L’expérience',
      title: 'Pas un fil. Un point de vue.',
      body: 'Parcourez la journée d’une personne comme elle l’a vécue : une vidéo, une pensée, une photo, une pause. Sans foule d’inconnus en compétition pour le prochain geste.',
      previewLabel: 'Aperçu du voyage',
      previewNote:
        'Aperçu conceptuel. Le flux immersif et le Live ne sont pas encore disponibles dans l’application actuelle.',
      actions: ['Demander', 'Garder', 'Partager'],
      moments: [
        {
          id: 'video',
          label: 'Vidéo',
          eyebrow: 'Moment 01 · 00:43 / 00:59',
          title: 'Le train est parti avant l’aube.',
          detail: 'Vidéo courte',
          caption: 'Un moment en mouvement, en moins d’une minute.',
        },
        {
          id: 'photo',
          label: 'Photo',
          eyebrow: 'Moment 03 · 08:14',
          title: 'Le calme avant que tout commence.',
          detail: 'Photo',
          caption: 'Une seule image peut contenir toute une humeur.',
        },
        {
          id: 'text',
          label: 'Texte',
          eyebrow: 'Moment 06 · Avec ses mots',
          title: 'Je pensais avoir besoin d’un plan. Il me fallait un début.',
          detail: 'Moment texte',
          caption: 'Une place pour les pensées sans caméra.',
        },
        {
          id: 'live',
          label: 'Live',
          eyebrow: 'À l’horizon · Live',
          title: 'Être là quand ça arrive.',
          detail: 'Direction future',
          caption: 'Un moment partagé, sans transformer une vie en spectacle.',
        },
      ],
    },
    chosen: {
      eyebrow: 'Rencontrer l’Élu·e',
      title: 'Sa journée. Sa voix. Son choix.',
      body: 'L’Élu·e est la personne dont la communauté accueille le voyage aujourd’hui. Elle est sélectionnée équitablement, invitée—jamais obligée—et choisit ce qui entre dans son histoire.',
      roleLabel: 'Le rôle du jour',
      roleTitle: 'L’Élu·e',
      roleBody:
        'Une personne ordinaire occupe tout le cadre. Les autres peuvent enfin vraiment la rencontrer.',
      formatsLabel: 'Un voyage peut contenir',
      formats: [
        'Vidéo · 59 s max.',
        'Photo',
        'Texte',
        'Voix',
        'Moments',
        'Étapes',
      ],
      selectionLink: 'Voir comment fonctionne la sélection',
    },
    participate: {
      eyebrow: 'Être présent, sans jouer un rôle',
      title: 'Vous faites partie du voyage. Vous n’êtes pas l’algorithme.',
      body: 'Le public peut se rapprocher sans prendre toute la place. L’application actuelle garde la participation simple, humaine et intentionnelle.',
      items: [
        {
          number: '01',
          title: 'Poser une vraie question',
          body: 'Les questions ouvrent la conversation. Un vote peut faire remonter la plus juste—sans vote négatif.',
        },
        {
          number: '02',
          title: 'Garder ce qui vous touche',
          body: 'Se souvenir ajoute une personne à votre bibliothèque privée. Le total ne devient jamais un score.',
        },
        {
          number: '03',
          title: 'Le transmettre',
          body: 'Partagez un voyage parce qu’il compte, pas parce qu’un classement l’a décidé.',
        },
      ],
    },
    live: {
      eyebrow: 'En direct, au bon moment',
      title: 'Être là quand ça arrive.',
      body: 'Le Live a sa place quand le moment le demande—pas comme une obligation permanente de se montrer. Il fait partie de la direction produit, après la sécurité et le contrôle.',
      futureLabel: 'Aperçu tourné vers l’avenir',
      visualTitle: 'Un moment. Partagé maintenant.',
      visualBody:
        'Conversation, réactions et souvenir à revoir—sans tableau de popularité.',
      visualMeta: 'Concept Live · pas encore disponible',
    },
    safety: {
      eyebrow: 'Les limites font partie du produit',
      title: 'Votre voyage. Vos limites.',
      body: 'Être choisi ne signifie jamais perdre le contrôle. Ces protections font déjà partie du modèle actuel d’Unumae.',
      principles: [
        {
          title: 'Un vrai oui',
          body: 'La sélection est une invitation. Refuser n’a aucune conséquence et rien n’est publié sans accord explicite.',
        },
        {
          title: 'Une personne avant la publication',
          body: 'Chaque portrait est relu par une personne. Le signalement et la modération sont intégrés à l’expérience.',
        },
        {
          title: 'Une porte de sortie',
          body: 'Chacun peut supprimer son compte et demander le retrait de son histoire publiée des Archives.',
        },
      ],
      link: 'Lire les règles de la communauté',
    },
    closing: {
      eyebrow: 'Le prochain voyage n’a pas encore commencé',
      title: 'Venez pour les moments. Restez pour la personne.',
      body: 'Unumae est encore en développement. Découvrez aujourd’hui son espace de prélancement, puis revenez voir le voyage prendre forme.',
      primaryLink: 'Voir Aujourd’hui',
      secondaryLink: 'Pourquoi Unumae existe',
      launchState: 'Bientôt sur iPhone · aucune liste d’attente',
    },
  },
  de: {
    hero: {
      eyebrow: 'Ein Mensch · eine Geschichte in Bewegung',
      firstLine: 'Die Reise',
      secondLine: 'gehört dir.',
      introduction:
        'Ein Mensch wird zum Chosen One. Einen Tag lang entfaltet sich seine Welt in Momenten—und alle anderen können sie miterleben.',
      primaryLink: 'Die Reise beginnen',
      selectionLink: 'Warum ein Mensch?',
      launchState: 'In Entwicklung · bald fürs iPhone',
      previewLabel: 'Vorschau der Produktrichtung',
      previewAlt:
        'Konzeptionelle mobile Ansicht eines Fotomoments aus der Reise des Chosen One.',
      previewMoment: 'Moment 03 · Foto',
      previewCaption: 'Die Ruhe, bevor alles beginnt.',
      previewNote: 'Redaktionelle Vorschau · keine Person gezeigt',
    },
    path: ['Entdecken', 'Dabeibleiben', 'Mitmachen', 'Erinnern'],
    experience: {
      eyebrow: 'Das Erlebnis',
      title: 'Kein Feed. Eine Perspektive.',
      body: 'Erlebe den Tag eines Menschen so, wie er ihn erlebt hat: ein Clip, ein Gedanke, ein Foto, eine Pause. Kein Stapel Fremder, die um den nächsten Swipe kämpfen.',
      previewLabel: 'Reise-Vorschau',
      previewNote:
        'Konzeptvorschau. Der immersive Stream und Live sind in der aktuellen App noch nicht verfügbar.',
      actions: ['Fragen', 'Erinnern', 'Teilen'],
      moments: [
        {
          id: 'video',
          label: 'Video',
          eyebrow: 'Moment 01 · 00:43 / 00:59',
          title: 'Der Zug fuhr vor Sonnenaufgang ab.',
          detail: 'Kurzvideo',
          caption: 'Ein bewegter Moment, kürzer als eine Minute.',
        },
        {
          id: 'photo',
          label: 'Foto',
          eyebrow: 'Moment 03 · 08:14',
          title: 'Die Ruhe, bevor alles beginnt.',
          detail: 'Foto',
          caption: 'Ein Bild kann die ganze Stimmung tragen.',
        },
        {
          id: 'text',
          label: 'Text',
          eyebrow: 'Moment 06 · In eigenen Worten',
          title:
            'Ich dachte, ich bräuchte einen Plan. Ich brauchte einen Anfang.',
          detail: 'Textmoment',
          caption: 'Raum für Gedanken, die keine Kamera brauchen.',
        },
        {
          id: 'live',
          label: 'Live',
          eyebrow: 'Am Horizont · Live',
          title: 'Sei dabei, wenn es passiert.',
          detail: 'Zukünftige Richtung',
          caption: 'Ein geteilter Moment, ohne ein Leben zur Show zu machen.',
        },
      ],
    },
    chosen: {
      eyebrow: 'Der Chosen One',
      title: 'Der eigene Tag. Die eigene Stimme. Die eigene Wahl.',
      body: 'Der Chosen One ist der Mensch, für dessen Reise die Community heute Raum schafft. Fair ausgewählt, eingeladen—nicht verpflichtet—und selbstbestimmt darin, was Teil der Geschichte wird.',
      roleLabel: 'Die heutige Rolle',
      roleTitle: 'Der Chosen One',
      roleBody:
        'Ein ganz normaler Mensch bekommt den ganzen Rahmen. Alle anderen können ihm wirklich begegnen.',
      formatsLabel: 'Eine Reise kann enthalten',
      formats: [
        'Video · bis 59 Sek.',
        'Foto',
        'Text',
        'Stimme',
        'Momente',
        'Meilensteine',
      ],
      selectionLink: 'So funktioniert die Auswahl',
    },
    participate: {
      eyebrow: 'Dabei sein, nicht auftreten',
      title: 'Du bist Teil der Reise. Du bist nicht der Algorithmus.',
      body: 'Zuschauende können näherkommen, ohne zu übernehmen. Die aktuelle App hält Beteiligung klein, menschlich und bewusst.',
      items: [
        {
          number: '01',
          title: 'Etwas Echtes fragen',
          body: 'Fragen eröffnen Gespräche. Eine Stimme kann eine gute Frage hervorheben—einen Downvote gibt es nicht.',
        },
        {
          number: '02',
          title: 'Bewahren, was dich bewegt',
          body: 'Erinnern legt einen Menschen in deine private Sammlung. Die Zahl wird nie zu einem Score.',
        },
        {
          number: '03',
          title: 'Weitergeben',
          body: 'Teile eine Reise, weil sie etwas bedeutet—nicht weil ein Ranking es sagt.',
        },
      ],
    },
    live: {
      eyebrow: 'Live, wenn es passt',
      title: 'Sei dabei, wenn es passiert.',
      body: 'Live gehört in eine Reise, wenn der Moment zählt—nicht als ständiger Zwang aufzutreten. Es ist Teil der Produktrichtung, bei der Sicherheit und Kontrolle zuerst kommen.',
      futureLabel: 'Zukunftsvorschau',
      visualTitle: 'Ein Moment. Jetzt gemeinsam.',
      visualBody:
        'Gespräch, Reaktionen und eine Erinnerung zum Wiedersehen—ohne Beliebtheitsanzeige.',
      visualMeta: 'Live-Konzept · derzeit nicht verfügbar',
    },
    safety: {
      eyebrow: 'Grenzen gehören ins Produkt',
      title: 'Deine Reise. Deine Grenzen.',
      body: 'Ausgewählt zu sein bedeutet nie, Kontrolle abzugeben. Diese Schutzmaßnahmen gehören schon heute zu Unumaes Modell.',
      principles: [
        {
          title: 'Ein echtes Ja',
          body: 'Die Auswahl ist eine Einladung. Ablehnen hat keine Nachteile, und ohne ausdrückliche Zustimmung wird nichts veröffentlicht.',
        },
        {
          title: 'Menschen vor Veröffentlichung',
          body: 'Jedes Porträt wird von einem Menschen geprüft. Melden und Moderation sind Teil des Erlebnisses.',
        },
        {
          title: 'Ein Weg zurück',
          body: 'Menschen können ihr Konto löschen und die Entfernung ihrer veröffentlichten Geschichte aus dem Archiv verlangen.',
        },
      ],
      link: 'Die Community-Regeln lesen',
    },
    closing: {
      eyebrow: 'Die nächste Reise hat noch nicht begonnen',
      title: 'Komm für die Momente. Bleib für den Menschen.',
      body: 'Unumae ist noch in Entwicklung. Sieh dir heute den ehrlichen Vorab-Raum an und komm wieder, während die Reise Gestalt annimmt.',
      primaryLink: 'Heute ansehen',
      secondaryLink: 'Warum es Unumae gibt',
      launchState: 'Bald fürs iPhone · noch keine Warteliste',
    },
  },
};
