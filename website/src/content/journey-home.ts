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
  pathNote: string;
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
        'Each day, one person becomes the Chosen One. Their Journey unfolds through a finite sequence of moments—open to experience, question, remember, and share.',
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
    pathNote:
      'Stay with a Journey is coming: a private way to keep one close, never a public count.',
    experience: {
      eyebrow: 'The experience',
      title: 'One Journey, many moments.',
      body: 'Move through one person’s Journey as it takes shape: a thought, a photo, a question, a pause. Some Moments are here today; others are designed for what comes next.',
      previewLabel: 'Journey preview',
      previewNote:
        'Concept preview. Photo and text reflect today’s portrait; video and Live are designed for what comes next.',
      actions: ['Ask', 'Remember', 'Share'],
      moments: [
        {
          id: 'video',
          label: 'Video',
          eyebrow: 'Coming to Journeys · Moment 01 · 00:43 / 00:59',
          title: 'The train left before sunrise.',
          detail: 'Future · Short video',
          caption: 'A moving moment, kept to under a minute.',
        },
        {
          id: 'photo',
          label: 'Photo',
          eyebrow: 'Current portrait · Moment 03 · 08:14',
          title: 'The quiet before everything starts.',
          detail: 'Current · Photo',
          caption: 'One frame can hold the whole mood.',
        },
        {
          id: 'text',
          label: 'Text',
          eyebrow: 'Current portrait · Moment 06 · In their words',
          title: 'I thought I needed a plan. I needed a beginning.',
          detail: 'Current · Text moment',
          caption: 'Room for the thoughts that do not need a camera.',
        },
        {
          id: 'live',
          label: 'Live',
          eyebrow: 'Future direction · Live',
          title: 'Be there when it happens.',
          detail: 'Future · Live',
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
      formatsLabel: 'The story can move through',
      formats: [
        'Photo · today',
        'Text · today',
        'Questions · today',
        'Short video · future',
        'Milestones · future',
        'Live · future',
      ],
      selectionLink: 'See how selection works',
    },
    participate: {
      eyebrow: 'Show up, don’t perform',
      title: 'You can be more than a viewer.',
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
      eyebrow: 'Designed for what comes next',
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
      title: 'Come for the moments. Return for the person.',
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
        'Chaque jour, une personne devient l’Élu·e. Son Journey se déploie en une suite finie de moments—à vivre, questionner, garder en mémoire et partager.',
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
    pathNote:
      'Rester avec une Journey viendra plus tard : une façon privée d’en garder une près de soi, jamais un compteur public.',
    experience: {
      eyebrow: 'L’expérience',
      body: 'Parcourez le Journey d’une personne au fil de son déroulement : une pensée, une photo, une question, une pause. Certains moments existent déjà ; d’autres sont conçus pour la suite.',
      title: 'Un Journey, plusieurs moments.',
      previewLabel: 'Aperçu du voyage',
      previewNote:
        'Aperçu conceptuel. La photo et le texte reflètent le portrait actuel ; la vidéo et le Live sont conçus pour la suite.',
      actions: ['Demander', 'Garder', 'Partager'],
      moments: [
        {
          id: 'video',
          label: 'Vidéo',
          eyebrow: 'À venir dans les Journeys · Moment 01 · 00:43 / 00:59',
          title: 'Le train est parti avant l’aube.',
          detail: 'Futur · Vidéo courte',
          caption: 'Un moment en mouvement, en moins d’une minute.',
        },
        {
          id: 'photo',
          label: 'Photo',
          eyebrow: 'Portrait actuel · Moment 03 · 08:14',
          title: 'Le calme avant que tout commence.',
          detail: 'Actuel · Photo',
          caption: 'Une seule image peut contenir toute une humeur.',
        },
        {
          id: 'text',
          label: 'Texte',
          eyebrow: 'Portrait actuel · Moment 06 · Avec ses mots',
          title: 'Je pensais avoir besoin d’un plan. Il me fallait un début.',
          detail: 'Actuel · Moment texte',
          caption: 'Une place pour les pensées sans caméra.',
        },
        {
          id: 'live',
          label: 'Live',
          eyebrow: 'Direction future · Live',
          title: 'Être là quand ça arrive.',
          detail: 'Futur · Live',
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
      formatsLabel: 'L’histoire peut passer par',
      formats: [
        'Photo · aujourd’hui',
        'Texte · aujourd’hui',
        'Questions · aujourd’hui',
        'Vidéo courte · pour la suite',
        'Jalons · pour la suite',
        'Live · pour la suite',
      ],
      selectionLink: 'Voir comment fonctionne la sélection',
    },
    participate: {
      eyebrow: 'Être présent, sans jouer un rôle',
      title: 'Vous pouvez faire plus que regarder.',
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
      eyebrow: 'Pensé pour la suite',
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
      title: 'Venez pour les moments. Revenez pour la personne.',
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
        'Jeden Tag wird ein Mensch zum Chosen One. Seine Journey entfaltet sich in einer endlichen Folge von Momenten—zum Erleben, Fragen, Erinnern und Teilen.',
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
    pathNote:
      'Bei einer Journey bleiben kommt später: eine private Nähe zu einer Geschichte, niemals eine öffentliche Zahl.',
    experience: {
      eyebrow: 'Das Erlebnis',
      title: 'Eine Journey, viele Momente.',
      body: 'Erlebe die Journey eines Menschen, wie sie Gestalt annimmt: ein Gedanke, ein Foto, eine Frage, eine Pause. Manche Momente gibt es heute schon; andere sind für das Kommende gedacht.',
      previewLabel: 'Reise-Vorschau',
      previewNote:
        'Konzeptvorschau. Foto und Text spiegeln das heutige Porträt; Video und Live sind für das Kommende gedacht.',
      actions: ['Fragen', 'Erinnern', 'Teilen'],
      moments: [
        {
          id: 'video',
          label: 'Video',
          eyebrow: 'Kommt in Journeys · Moment 01 · 00:43 / 00:59',
          title: 'Der Zug fuhr vor Sonnenaufgang ab.',
          detail: 'Zukunft · Kurzvideo',
          caption: 'Ein bewegter Moment, kürzer als eine Minute.',
        },
        {
          id: 'photo',
          label: 'Foto',
          eyebrow: 'Aktuelles Porträt · Moment 03 · 08:14',
          title: 'Die Ruhe, bevor alles beginnt.',
          detail: 'Aktuell · Foto',
          caption: 'Ein Bild kann die ganze Stimmung tragen.',
        },
        {
          id: 'text',
          label: 'Text',
          eyebrow: 'Aktuelles Porträt · Moment 06 · In eigenen Worten',
          title:
            'Ich dachte, ich bräuchte einen Plan. Ich brauchte einen Anfang.',
          detail: 'Aktuell · Textmoment',
          caption: 'Raum für Gedanken, die keine Kamera brauchen.',
        },
        {
          id: 'live',
          label: 'Live',
          eyebrow: 'Zukunftsrichtung · Live',
          title: 'Sei dabei, wenn es passiert.',
          detail: 'Zukunft · Live',
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
      formatsLabel: 'Die Geschichte kann durch',
      formats: [
        'Foto · heute',
        'Text · heute',
        'Fragen · heute',
        'Kurzvideo · für später',
        'Meilensteine · für später',
        'Live · für später',
      ],
      selectionLink: 'So funktioniert die Auswahl',
    },
    participate: {
      eyebrow: 'Dabei sein, nicht auftreten',
      title: 'Du kannst mehr sein als Zuschauer.',
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
      eyebrow: 'Für das Kommende gedacht',
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
      title: 'Komm für die Momente. Komm für den Menschen zurück.',
      body: 'Unumae ist noch in Entwicklung. Sieh dir heute den ehrlichen Vorab-Raum an und komm wieder, während die Reise Gestalt annimmt.',
      primaryLink: 'Heute ansehen',
      secondaryLink: 'Warum es Unumae gibt',
      launchState: 'Bald fürs iPhone · noch keine Warteliste',
    },
  },
};
