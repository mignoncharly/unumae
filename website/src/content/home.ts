import type { Locale } from './site';

interface HomeCopy {
  hero: {
    eyebrow: string;
    firstLine: string;
    secondLine: string;
    introduction: string;
    selectionLink: string;
    launchState: string;
  };
  premise: {
    eyebrow: string;
    title: string;
    body: string;
    facts: readonly { value: string; label: string }[];
  };
  portrait: {
    eyebrow: string;
    title: string;
    body: string;
    previewLabel: string;
    previewDetail: string;
    promptsLabel: string;
    prompts: readonly string[];
    disclaimer: string;
  };
  day: {
    eyebrow: string;
    title: string;
    introduction: string;
    stages: readonly { number: string; title: string; body: string }[];
  };
  manifesto: {
    eyebrow: string;
    title: string;
    body: string;
    exclusions: readonly string[];
    conclusion: string;
  };
  archive: {
    eyebrow: string;
    title: string;
    body: string;
    modes: readonly string[];
    rule: string;
    removal: string;
    link: string;
  };
  fairness: {
    eyebrow: string;
    title: string;
    body: string;
    proofLabel: string;
    proof: readonly { label: string; value: string }[];
    link: string;
  };
  closing: {
    eyebrow: string;
    title: string;
    body: string;
    link: string;
  };
}

export const homeContent: Record<Locale, HomeCopy> = {
  en: {
    hero: {
      eyebrow: 'One global day · 00:00–23:59 UTC',
      firstLine: '8 billion people.',
      secondLine: 'One today.',
      introduction:
        'Every day, one ordinary person becomes Today’s Human. For 24 hours, the world gives one story its full attention.',
      selectionLink: 'See how selection works',
      launchState: 'Coming to iPhone',
    },
    premise: {
      eyebrow: 'The premise',
      title: 'One person. One day. Together.',
      body: 'Not a stream of people competing to be noticed. One guided story, open to everyone at the same time—including visitors without an account.',
      facts: [
        { value: '1', label: 'ordinary person' },
        { value: '24h', label: 'shared global window' },
        { value: '∞', label: 'ways to be human' },
      ],
    },
    portrait: {
      eyebrow: 'The story',
      title: 'A portrait in their own words.',
      body: 'Today’s Human responds to the same gentle prompts in text, voice, photo, or video. The structure stays familiar; every answer is singular.',
      previewLabel: 'Story format preview',
      previewDetail: 'Abstract composition · no Human shown',
      promptsLabel: 'Guided prompts',
      prompts: [
        'Today I feel…',
        'Something I love…',
        'An ordinary moment I treasure…',
      ],
      disclaimer:
        'Format preview only. No person or story is represented here.',
    },
    day: {
      eyebrow: 'How a day works',
      title: 'Care before attention.',
      introduction:
        'At launch, every live day will follow one deliberate sequence. There is no instant posting and no race to perform.',
      stages: [
        {
          number: '01',
          title: 'Selected',
          body: 'An eligible person is chosen by the recorded draw.',
        },
        {
          number: '02',
          title: 'Invited',
          body: 'They have 12 hours to choose freely whether to take part.',
        },
        {
          number: '03',
          title: 'Tells their story',
          body: 'Guided prompts help them make a finite portrait.',
        },
        {
          number: '04',
          title: 'Reviewed by a person',
          body: 'A person reviews the portrait and answers before publication.',
        },
        {
          number: '05',
          title: 'Live for 24 hours',
          body: 'The same Human is present worldwide for one UTC day.',
        },
        {
          number: '06',
          title: 'Remembered',
          body: 'Their place in the sequence becomes part of the Archive.',
        },
      ],
    },
    manifesto: {
      eyebrow: 'A deliberate limit',
      title: 'This is not another social network.',
      body: 'Attention is scarce. Unumae gives it to one person instead of turning it into a contest.',
      exclusions: [
        'No followers',
        'No rankings',
        'No paid boost',
        'No infinite feed',
      ],
      conclusion:
        'Nothing to win. No one to outperform. Just a person to meet.',
    },
    archive: {
      eyebrow: 'The Human Archive',
      title: 'Everyone the world has met.',
      body: 'After each day, the sequence grows by one. Explore it by time, by country, or by chance—not by who collected the most attention.',
      modes: ['By time', 'By country', 'At random'],
      rule: 'Never by popularity',
      removal:
        'A Human can ask for their story to be removed. Their number and date remain as a quiet place in the sequence.',
      link: 'Visit the Archive preview',
    },
    fairness: {
      eyebrow: 'Fairness, made inspectable',
      title: 'Equal means equal.',
      body: 'Every eligible person enters the frozen pool on the same terms. Payment, fame, nationality, and engagement never improve the odds. The seed and result are recorded so the ordering can be reproduced.',
      proofLabel: 'A reproducible daily draw',
      proof: [
        { label: 'Input', value: 'Frozen eligible pool' },
        { label: 'Method', value: 'Secure recorded seed' },
        { label: 'Output', value: '1 primary + 3 backups' },
      ],
      link: 'Read the selection method',
    },
    closing: {
      eyebrow: 'Unumae · Coming to iPhone',
      title: 'Meet one person. Come back tomorrow.',
      body: 'Unumae is preparing for launch. There is no download or waitlist yet—just a promise we intend to keep carefully.',
      link: 'Why Unumae exists',
    },
  },
  fr: {
    hero: {
      eyebrow: 'Une journée mondiale · 00:00–23:59 UTC',
      firstLine: '8 milliards de personnes.',
      secondLine: 'Une aujourd’hui.',
      introduction:
        'Chaque jour, une personne ordinaire devient l’Humain du jour. Pendant 24 heures, le monde accorde toute son attention à une seule histoire.',
      selectionLink: 'Voir comment fonctionne la sélection',
      launchState: 'Bientôt sur iPhone',
    },
    premise: {
      eyebrow: 'Le principe',
      title: 'Une personne. Un jour. Ensemble.',
      body: 'Pas un flux de personnes en compétition pour être vues. Une histoire guidée, ouverte à tout le monde au même moment—même sans compte.',
      facts: [
        { value: '1', label: 'personne ordinaire' },
        { value: '24 h', label: 'fenêtre mondiale partagée' },
        { value: '∞', label: 'façons d’être humain' },
      ],
    },
    portrait: {
      eyebrow: 'L’histoire',
      title: 'Un portrait avec ses propres mots.',
      body: 'L’Humain du jour répond aux mêmes invitations bienveillantes en texte, voix, photo ou vidéo. La structure reste familière ; chaque réponse est unique.',
      previewLabel: 'Aperçu du format',
      previewDetail: 'Composition abstraite · aucun Humain représenté',
      promptsLabel: 'Invitations guidées',
      prompts: [
        'Aujourd’hui, je me sens…',
        'Quelque chose que j’aime…',
        'Un moment ordinaire qui m’est précieux…',
      ],
      disclaimer:
        'Aperçu du format uniquement. Aucune personne ni histoire n’est représentée ici.',
    },
    day: {
      eyebrow: 'Le déroulement d’une journée',
      title: 'Le soin avant l’attention.',
      introduction:
        'Au lancement, chaque journée suivra une séquence réfléchie. Pas de publication instantanée, ni de course à la performance.',
      stages: [
        {
          number: '01',
          title: 'Sélection',
          body: 'Une personne éligible est choisie par le tirage enregistré.',
        },
        {
          number: '02',
          title: 'Invitation',
          body: 'Elle dispose de 12 heures pour choisir librement de participer.',
        },
        {
          number: '03',
          title: 'Son histoire',
          body: 'Des invitations guidées l’aident à créer un portrait fini.',
        },
        {
          number: '04',
          title: 'Relecture humaine',
          body: 'Preuve de vie et modération humaine précèdent la publication.',
        },
        {
          number: '05',
          title: 'En ligne pendant 24 h',
          body: 'Le même Humain est présent dans le monde entier un jour UTC.',
        },
        {
          number: '06',
          title: 'Dans les mémoires',
          body: 'Sa place dans la séquence rejoint les Archives.',
        },
      ],
    },
    manifesto: {
      eyebrow: 'Une limite délibérée',
      title: 'Ceci n’est pas un réseau social de plus.',
      body: 'L’attention est rare. Unumae la donne à une personne au lieu d’en faire un concours.',
      exclusions: [
        'Aucun follower',
        'Aucun classement',
        'Aucune mise en avant payante',
        'Aucun fil infini',
      ],
      conclusion:
        'Rien à gagner. Personne à dépasser. Juste une personne à rencontrer.',
    },
    archive: {
      eyebrow: 'Les Archives humaines',
      title: 'Toutes les personnes rencontrées par le monde.',
      body: 'Après chaque journée, la séquence s’agrandit d’une personne. Parcourez-la par date, par pays ou au hasard—jamais selon l’attention reçue.',
      modes: ['Par date', 'Par pays', 'Au hasard'],
      rule: 'Jamais par popularité',
      removal:
        'Un Humain peut demander le retrait de son histoire. Son numéro et la date gardent une place discrète dans la séquence.',
      link: 'Voir l’aperçu des Archives',
    },
    fairness: {
      eyebrow: 'Une équité vérifiable',
      title: 'Égale veut vraiment dire égale.',
      body: 'Chaque personne éligible entre dans le groupe figé aux mêmes conditions. Paiement, célébrité, nationalité et engagement n’améliorent jamais les chances. La graine et le résultat sont enregistrés pour reproduire l’ordre.',
      proofLabel: 'Un tirage quotidien reproductible',
      proof: [
        { label: 'Entrée', value: 'Groupe éligible figé' },
        { label: 'Méthode', value: 'Graine sécurisée enregistrée' },
        { label: 'Résultat', value: '1 personne + 3 remplaçants' },
      ],
      link: 'Lire la méthode de sélection',
    },
    closing: {
      eyebrow: 'Unumae · Bientôt sur iPhone',
      title: 'Rencontrez une personne. Revenez demain.',
      body: 'Unumae prépare son lancement. Ni téléchargement ni liste d’attente pour le moment—seulement une promesse que nous voulons tenir avec soin.',
      link: 'Pourquoi Unumae existe',
    },
  },
  de: {
    hero: {
      eyebrow: 'Ein globaler Tag · 00:00–23:59 UTC',
      firstLine: '8 Milliarden Menschen.',
      secondLine: 'Heute einer.',
      introduction:
        'Jeden Tag wird ein gewöhnlicher Mensch zum Menschen des Tages. 24 Stunden lang schenkt die Welt einer Geschichte ihre volle Aufmerksamkeit.',
      selectionLink: 'So funktioniert die Auswahl',
      launchState: 'Demnächst fürs iPhone',
    },
    premise: {
      eyebrow: 'Die Idee',
      title: 'Ein Mensch. Ein Tag. Gemeinsam.',
      body: 'Kein Strom von Menschen, die um Sichtbarkeit konkurrieren. Eine geführte Geschichte, für alle gleichzeitig offen—auch ohne Konto.',
      facts: [
        { value: '1', label: 'gewöhnlicher Mensch' },
        { value: '24 Std.', label: 'gemeinsames globales Fenster' },
        { value: '∞', label: 'Arten, Mensch zu sein' },
      ],
    },
    portrait: {
      eyebrow: 'Die Geschichte',
      title: 'Ein Porträt in eigenen Worten.',
      body: 'Der Mensch des Tages antwortet auf dieselben behutsamen Impulse mit Text, Stimme, Foto oder Video. Die Struktur bleibt vertraut; jede Antwort ist einzigartig.',
      previewLabel: 'Vorschau des Formats',
      previewDetail: 'Abstrakte Komposition · kein Mensch dargestellt',
      promptsLabel: 'Geführte Impulse',
      prompts: [
        'Heute fühle ich mich…',
        'Etwas, das ich liebe…',
        'Ein gewöhnlicher Moment, der mir viel bedeutet…',
      ],
      disclaimer:
        'Nur eine Vorschau des Formats. Hier wird keine Person oder Geschichte dargestellt.',
    },
    day: {
      eyebrow: 'So läuft ein Tag ab',
      title: 'Sorgfalt vor Aufmerksamkeit.',
      introduction:
        'Zum Start folgt jeder Live-Tag einem bewussten Ablauf. Kein sofortiges Posten und kein Wettlauf um Wirkung.',
      stages: [
        {
          number: '01',
          title: 'Ausgewählt',
          body: 'Die aufgezeichnete Ziehung bestimmt eine berechtigte Person.',
        },
        {
          number: '02',
          title: 'Eingeladen',
          body: 'Sie hat 12 Stunden, um sich frei für oder gegen die Teilnahme zu entscheiden.',
        },
        {
          number: '03',
          title: 'Erzählt ihre Geschichte',
          body: 'Geführte Impulse helfen, ein endliches Porträt zu gestalten.',
        },
        {
          number: '04',
          title: 'Von Menschen geprüft',
          body: 'Lebendigkeitsprüfung und menschliche Moderation kommen vor der Veröffentlichung.',
        },
        {
          number: '05',
          title: '24 Stunden live',
          body: 'Weltweit ist am selben UTC-Tag derselbe Mensch zu sehen.',
        },
        {
          number: '06',
          title: 'Erinnert',
          body: 'Der Platz in der Reihenfolge wird Teil des Archivs.',
        },
      ],
    },
    manifesto: {
      eyebrow: 'Eine bewusste Grenze',
      title: 'Das ist nicht noch ein soziales Netzwerk.',
      body: 'Aufmerksamkeit ist knapp. Unumae schenkt sie einem Menschen, statt daraus einen Wettbewerb zu machen.',
      exclusions: [
        'Keine Follower',
        'Keine Ranglisten',
        'Keine bezahlte Reichweite',
        'Kein endloser Feed',
      ],
      conclusion:
        'Nichts zu gewinnen. Niemanden zu übertreffen. Nur ein Mensch, dem du begegnen kannst.',
    },
    archive: {
      eyebrow: 'Das Menschenarchiv',
      title: 'Alle Menschen, denen die Welt begegnet ist.',
      body: 'Nach jedem Tag wächst die Reihenfolge um einen Menschen. Entdecke sie nach Zeit, Land oder per Zufall—nie danach, wer die meiste Aufmerksamkeit bekam.',
      modes: ['Nach Zeit', 'Nach Land', 'Per Zufall'],
      rule: 'Nie nach Beliebtheit',
      removal:
        'Ein Mensch kann um Entfernung seiner Geschichte bitten. Nummer und Datum behalten einen stillen Platz in der Reihenfolge.',
      link: 'Vorschau des Archivs ansehen',
    },
    fairness: {
      eyebrow: 'Überprüfbare Fairness',
      title: 'Gleich heißt gleich.',
      body: 'Jede berechtigte Person kommt zu denselben Bedingungen in den eingefrorenen Pool. Zahlung, Ruhm, Nationalität und Engagement verbessern nie die Chancen. Seed und Ergebnis werden festgehalten, damit die Reihenfolge reproduzierbar ist.',
      proofLabel: 'Eine reproduzierbare tägliche Ziehung',
      proof: [
        { label: 'Eingabe', value: 'Eingefrorener berechtigter Pool' },
        { label: 'Methode', value: 'Sicherer aufgezeichneter Seed' },
        { label: 'Ausgabe', value: '1 Hauptperson + 3 Ersatzpersonen' },
      ],
      link: 'Auswahlmethode lesen',
    },
    closing: {
      eyebrow: 'Unumae · Demnächst fürs iPhone',
      title: 'Begegne einem Menschen. Komm morgen wieder.',
      body: 'Unumae bereitet den Start vor. Noch gibt es weder Download noch Warteliste—nur ein Versprechen, das wir sorgfältig halten wollen.',
      link: 'Warum es Unumae gibt',
    },
  },
};
