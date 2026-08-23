import type { Locale } from './site';

export const trustPageKeys = [
  'about',
  'how-selection-works',
  'community-guidelines',
] as const;

export type TrustPageKey = (typeof trustPageKeys)[number];

interface AboutCopy {
  hero: { eyebrow: string; title: string; introduction: string };
  promise: {
    eyebrow: string;
    title: string;
    quote: string;
    commitments: readonly { term: string; meaning: string }[];
  };
  limits: {
    eyebrow: string;
    title: string;
    introduction: string;
    items: readonly { title: string; body: string }[];
  };
  access: {
    eyebrow: string;
    title: string;
    body: string;
    rights: readonly string[];
  };
  international: {
    eyebrow: string;
    title: string;
    body: string;
    languageNote: string;
  };
  closing: { title: string; body: string; link: string };
}

interface SelectionCopy {
  hero: { eyebrow: string; title: string; introduction: string };
  facts: readonly { value: string; label: string }[];
  eligibility: {
    eyebrow: string;
    title: string;
    introduction: string;
    criteria: readonly string[];
    conclusion: string;
  };
  draw: {
    eyebrow: string;
    title: string;
    introduction: string;
    steps: readonly { time: string; title: string; body: string }[];
  };
  exclusions: {
    eyebrow: string;
    title: string;
    introduction: string;
    items: readonly string[];
  };
  consent: {
    eyebrow: string;
    title: string;
    body: string;
    sequence: readonly string[];
    note: string;
  };
  publication: {
    eyebrow: string;
    title: string;
    body: string;
    quietDay: string;
  };
  audit: {
    eyebrow: string;
    title: string;
    body: string;
    note: string;
  };
}

interface GuidelineRule {
  title: string;
  paragraphs: readonly string[];
  examples?: readonly string[];
  bullets?: readonly string[];
}

interface GuidelinesCopy {
  hero: { eyebrow: string; title: string; introduction: string };
  canonicalNote: string;
  contentsLabel: string;
  rules: readonly GuidelineRule[];
  updated: string;
}

interface TrustCopy {
  about: AboutCopy;
  selection: SelectionCopy;
  guidelines: GuidelinesCopy;
}

export const trustContent: Record<Locale, TrustCopy> = {
  en: {
    about: {
      hero: {
        eyebrow: 'About Unumae',
        title: 'One person, seen properly.',
        introduction:
          'Unumae is a daily act of attention. One ordinary person tells a finite story; for one global day, everyone is invited to meet them.',
      },
      promise: {
        eyebrow: 'The promise',
        title: 'Ordinary. One. Remembered.',
        quote:
          'Every day, one ordinary person from the community becomes Today’s Human. The world discovers their story for 24 hours, asks them questions, and remembers them in the Human Archive.',
        commitments: [
          {
            term: 'Ordinary',
            meaning:
              'No curation for fame, beauty, reach, or an idea of who seems interesting.',
          },
          {
            term: 'One',
            meaning:
              'No second slot, runner-up, or stream of people competing beside them.',
          },
          {
            term: 'Remembered',
            meaning:
              'After the day ends, their place remains in the Archive—subject to their right to remove their story.',
          },
        ],
      },
      limits: {
        eyebrow: 'Limits with a purpose',
        title: 'The missing features are the point.',
        introduction:
          'Unumae refuses the mechanics that turn meeting a person into measuring one.',
        items: [
          {
            title: 'No audience to accumulate',
            body: 'There are no followers, public popularity counts, rankings, or leaderboards.',
          },
          {
            title: 'No attention to buy',
            body: 'Payment, sponsorship, and existing fame can never influence selection or visibility.',
          },
          {
            title: 'No private access',
            body: 'There are no direct messages. Exposure must not become a channel for private harassment.',
          },
          {
            title: 'No endless consumption',
            body: 'There is one story, it has a bottom, and the experience ends.',
          },
        ],
      },
      access: {
        eyebrow: 'Open by default',
        title: 'A person’s story is not a signup tactic.',
        body: 'Today’s Human, their portrait and questions, and the Human Archive remain open to guests. Reading never requires an account or app installation.',
        rights: [
          'The selected person can decline without consequence.',
          'They choose what to share and which questions to answer.',
          'They may withhold their city, exact age, and last name.',
          'They may request removal of their story from the Archive.',
        ],
      },
      international: {
        eyebrow: 'International from day one',
        title: 'Not one centre looking outward.',
        body: 'The same UTC day is shared everywhere. Nationality never affects the draw, and country is context—not a score, quota, or category of worth.',
        languageNote:
          'The interface begins in English, French, and German. A Human’s original words always remain visible when translations are added.',
      },
      closing: {
        title: 'Fair attention begins with a fair draw.',
        body: 'The promise only matters if every eligible person enters on equal terms.',
        link: 'See how selection works',
      },
    },
    selection: {
      hero: {
        eyebrow: 'How selection works',
        title: 'An equal chance means equal.',
        introduction:
          'The daily draw is deliberately separated from popularity, payment, nationality, and editorial taste. Eligibility is binary; nobody is “more eligible” than anyone else.',
      },
      facts: [
        { value: 'D−2', label: 'pool frozen at 00:00 UTC' },
        { value: '1 + 3', label: 'primary and ordered backups' },
        { value: '12h', label: 'time to accept freely' },
        { value: 'Once', label: 'one Human, one day, forever' },
      ],
      eligibility: {
        eyebrow: '01 · Eligibility',
        title: 'In the pool, or not.',
        introduction:
          'At pool-freeze time, every condition below must be true. There is no score or tier.',
        criteria: [
          'The account is active and verified by email or Apple.',
          'The account is at least seven days old.',
          'The person is 16 or older.',
          'The community rules have been accepted.',
          'The person has chosen to enter the draw.',
          'The person has never previously been Today’s Human.',
        ],
        conclusion:
          'Everyone who meets the same complete test receives the same probability.',
      },
      draw: {
        eyebrow: '02 · The draw',
        title: 'Frozen first. Recorded throughout.',
        introduction:
          'The ordering is produced once from an immutable snapshot, not from a live query that can drift.',
        steps: [
          {
            time: 'D−2 · 00:00',
            title: 'Freeze the eligible pool',
            body: 'A hash records exactly who was included. Someone who becomes eligible a minute later waits for the next pool.',
          },
          {
            time: 'D−2 · 00:05',
            title: 'Record a secure seed',
            body: 'The frozen pool and cryptographically secure random seed are stored without later modification.',
          },
          {
            time: 'Same operation',
            title: 'Order one primary and three backups',
            body: 'The result is deterministic from the recorded inputs and can be reproduced.',
          },
          {
            time: 'Permanent',
            title: 'Keep the audit row',
            body: 'Cancelled draws and replacements remain recorded; the history is not rewritten.',
          },
        ],
      },
      exclusions: {
        eyebrow: '03 · Forbidden inputs',
        title: 'The draw does not know who is popular.',
        introduction:
          'These signals are not merely ignored by policy. The selection engine is forbidden from receiving them.',
        items: [
          'Payment or subscription tier',
          'Followers or engagement',
          'Session count or content scores',
          'Sponsorship or admin preference',
          'Nationality quotas or language',
          'Beauty, photo, or profile-quality scoring',
        ],
      },
      consent: {
        eyebrow: '04 · Consent and backups',
        title: 'Selection is an invitation, not an obligation.',
        body: 'The primary candidate has 12 hours to accept. Declining or missing the notification carries no penalty and returns the person to future pools.',
        sequence: ['Primary', 'Backup 1', 'Backup 2', 'Backup 3'],
        note: 'If none can take part, an emergency re-draw uses the same frozen pool and keeps the original record. No one is published without explicit acceptance.',
      },
      publication: {
        eyebrow: '05 · Before publication',
        title: 'Being drawn is not enough to go live.',
        body: 'At launch, an accepted candidate completes liveness verification and a guided portrait. Automated checks and a person review the portrait before publication.',
        quietDay:
          'If nobody has accepted and passed review by the deadline, Unumae shows a Quiet Day. It never invents a Human, skips consent, or publishes unreviewed work.',
      },
      audit: {
        eyebrow: '06 · What can be verified',
        title: 'The record makes reproduction possible.',
        body: 'The pool hash, seed, ordered result, replacements, and draw version are retained so the selection can be reconstructed and audited.',
        note: 'Public cryptographic verification is a future transparency goal, not a feature claimed for this pre-launch website.',
      },
    },
    guidelines: {
      hero: {
        eyebrow: 'Community guidelines',
        title: 'Treat a stranger with respect.',
        introduction:
          'This is a small place with a simple promise: every day, one ordinary person is introduced to the world. These rules exist to keep that possible.',
      },
      canonicalNote:
        'Approved 22 August 2026. English is the canonical version. These are the rules a person accepts before entering the draw.',
      contentsLabel: 'On this page',
      rules: [
        {
          title: 'There is one person here at a time. Treat them that way.',
          paragraphs: [
            'Today’s Human is not content. They are somebody who agreed to be seen, once, by strangers. They chose to do something most people would find frightening.',
            'Ask them what you would ask a stranger you respected. If you would not say it to them in a room, do not send it here.',
          ],
        },
        {
          title: 'Ask questions. Do not deliver verdicts.',
          paragraphs: [
            'You can ask anything. You cannot use a question to make a statement about someone—about their country, their religion, their body, their politics, or their life.',
            'The difference is usually obvious:',
          ],
          examples: [
            '“What do people misunderstand about where you live?” — a question.',
            '“Why is your country like that?” — a verdict wearing a question mark.',
          ],
          bullets: [
            'We remove the second kind. Not because the topic is forbidden, but because it was not really a question.',
          ],
        },
        {
          title: 'Nobody here is competing.',
          paragraphs: [
            'There are no followers, no scores, no rankings, and no way to pay for attention. If you are here to build an audience, this is the wrong place, and nothing we add later will change that.',
            'Do not use questions, portraits, or reports to promote anything—yourself, a business, a cause, or another platform.',
          ],
        },
        {
          title: 'Tell the truth about who you are.',
          paragraphs: [
            'One account per person. Do not present yourself as somebody else, real or invented, and do not enter the draw on behalf of anyone but yourself.',
            'If you are selected, the story you tell must be your own. You may leave out anything you like—that is your right—but what you do say has to be true.',
          ],
        },
        {
          title: 'Some things are never allowed.',
          paragraphs: [],
          bullets: [
            'Harassment, threats, or targeting a person or group',
            'Hate directed at people for who they are',
            'Sexual content, and any sexual content involving minors, which we report to the authorities',
            'Encouraging self-harm or suicide',
            'Sharing anyone’s private information, including Today’s Human’s—where they live, work, or can be found',
            'Trying to contact Today’s Human outside this app after seeing them here',
          ],
        },
        {
          title: 'Protect the person, not the platform.',
          paragraphs: [
            'If something here worries you, report it. Reports are read by a person.',
            'Reporting is free, always available, and never held against you. If you are unsure whether something crosses a line, report it and let us decide—that is our job, not yours.',
          ],
        },
        {
          title: 'If you are selected',
          paragraphs: [
            'You will be asked, and you can say no. Declining costs you nothing and does not affect any future draw.',
            'If you accept:',
          ],
          bullets: [
            'You choose what to share. Every part of the portrait beyond the minimum is optional, and no question has to be answered.',
            'Your country is shown. Your city and your exact age are yours to withhold.',
            'A person reviews your portrait before it is published.',
            'You can ask to be removed from the Archive afterwards, and we will do it.',
          ],
        },
        {
          title: 'What happens when rules are broken',
          paragraphs: [
            'In order: content is removed, then the account is suspended, then banned. Serious harm—threats, sexual content involving minors, coordinated harassment—skips straight to the end and, where required, to the authorities.',
            'If you are banned you are out of every future draw. If you were previously published, your Archive entry is removed.',
            'You can dispute a decision. Say so and a different person will look at it.',
          ],
        },
        {
          title: 'These rules can change. The promise cannot.',
          paragraphs: [
            'We will update this page as we learn. What cannot change is underneath it: no followers, no rankings, no way to buy a better chance, and one ordinary person a day.',
          ],
        },
      ],
      updated: 'Last updated 22 August 2026.',
    },
  },
  fr: {
    about: {
      hero: {
        eyebrow: 'À propos d’Unumae',
        title: 'Voir vraiment une personne.',
        introduction:
          'Unumae est un geste d’attention quotidien. Une personne ordinaire raconte une histoire finie ; pendant une journée mondiale, chacun est invité à la rencontrer.',
      },
      promise: {
        eyebrow: 'La promesse',
        title: 'Ordinaire. Une. Dans les mémoires.',
        quote:
          'Chaque jour, une personne ordinaire de la communauté devient l’Humain du jour. Le monde découvre son histoire pendant 24 heures, lui pose des questions et s’en souvient dans les Archives humaines.',
        commitments: [
          {
            term: 'Ordinaire',
            meaning:
              'Aucune sélection selon la célébrité, la beauté, la portée ou une idée de ce qui serait intéressant.',
          },
          {
            term: 'Une',
            meaning:
              'Pas de deuxième place, de finaliste ni de flux de personnes en compétition à ses côtés.',
          },
          {
            term: 'Dans les mémoires',
            meaning:
              'Après cette journée, sa place reste dans les Archives—sous réserve de son droit à retirer son histoire.',
          },
        ],
      },
      limits: {
        eyebrow: 'Des limites qui ont un sens',
        title: 'Les fonctions absentes sont le principe.',
        introduction:
          'Unumae refuse les mécanismes qui transforment la rencontre d’une personne en mesure de sa valeur.',
        items: [
          {
            title: 'Aucune audience à accumuler',
            body: 'Ni followers, ni compteurs publics de popularité, ni classements.',
          },
          {
            title: 'Aucune attention à acheter',
            body: 'Paiement, sponsoring et célébrité ne peuvent jamais influencer la sélection ou la visibilité.',
          },
          {
            title: 'Aucun accès privé',
            body: 'Il n’y a pas de messages directs. L’exposition ne doit pas ouvrir la voie au harcèlement privé.',
          },
          {
            title: 'Aucune consommation infinie',
            body: 'Il y a une histoire, elle a une fin, et l’expérience s’arrête.',
          },
        ],
      },
      access: {
        eyebrow: 'Ouvert par défaut',
        title: 'L’histoire d’une personne n’est pas un piège à inscription.',
        body: 'L’Humain du jour, son portrait, les questions et les Archives humaines restent ouverts aux visiteurs. Lire ne demande ni compte ni installation.',
        rights: [
          'La personne sélectionnée peut refuser sans conséquence.',
          'Elle choisit ce qu’elle partage et les questions auxquelles elle répond.',
          'Elle peut garder secrets sa ville, son âge exact et son nom de famille.',
          'Elle peut demander le retrait de son histoire des Archives.',
        ],
      },
      international: {
        eyebrow: 'International dès le premier jour',
        title: 'Pas un centre qui regarde vers l’extérieur.',
        body: 'La même journée UTC est partagée partout. La nationalité n’influence jamais le tirage ; le pays donne un contexte, jamais un score, un quota ou une valeur.',
        languageNote:
          'L’interface commence en anglais, français et allemand. Les mots originaux d’un Humain restent toujours visibles quand une traduction est ajoutée.',
      },
      closing: {
        title: 'Une attention juste commence par un tirage juste.',
        body: 'La promesse ne vaut que si chaque personne éligible participe aux mêmes conditions.',
        link: 'Voir comment fonctionne la sélection',
      },
    },
    selection: {
      hero: {
        eyebrow: 'Comment fonctionne la sélection',
        title: 'Une chance égale est vraiment égale.',
        introduction:
          'Le tirage quotidien est séparé de la popularité, du paiement, de la nationalité et du goût éditorial. L’éligibilité est binaire ; personne n’est « plus éligible ».',
      },
      facts: [
        { value: 'J−2', label: 'groupe figé à 00:00 UTC' },
        { value: '1 + 3', label: 'personne principale et remplaçants' },
        { value: '12 h', label: 'pour accepter librement' },
        { value: 'Une fois', label: 'un Humain, un jour, pour toujours' },
      ],
      eligibility: {
        eyebrow: '01 · Éligibilité',
        title: 'Dans le groupe, ou pas.',
        introduction:
          'Au moment où le groupe est figé, toutes les conditions suivantes doivent être remplies. Il n’existe ni score ni niveau.',
        criteria: [
          'Le compte est actif et vérifié par e-mail ou Apple.',
          'Le compte existe depuis au moins sept jours.',
          'La personne a 16 ans ou plus.',
          'Les règles de la communauté ont été acceptées.',
          'La personne a choisi de participer au tirage.',
          'La personne n’a jamais été l’Humain du jour.',
        ],
        conclusion:
          'Toutes les personnes qui satisfont au même test complet ont la même probabilité.',
      },
      draw: {
        eyebrow: '02 · Le tirage',
        title: 'D’abord figé. Toujours enregistré.',
        introduction:
          'L’ordre est produit une fois depuis un instantané immuable, et non depuis une requête en direct qui pourrait changer.',
        steps: [
          {
            time: 'J−2 · 00:00',
            title: 'Figer le groupe éligible',
            body: 'Un hash consigne précisément qui en fait partie. Une personne devenue éligible une minute plus tard attend le groupe suivant.',
          },
          {
            time: 'J−2 · 00:05',
            title: 'Enregistrer une graine sécurisée',
            body: 'Le groupe figé et la graine aléatoire cryptographiquement sûre sont conservés sans modification ultérieure.',
          },
          {
            time: 'Même opération',
            title: 'Ordonner une personne principale et trois remplaçants',
            body: 'Le résultat est déterministe à partir des données enregistrées et peut être reproduit.',
          },
          {
            time: 'Permanent',
            title: 'Conserver la ligne d’audit',
            body: 'Les tirages annulés et les remplacements restent consignés ; l’histoire n’est pas réécrite.',
          },
        ],
      },
      exclusions: {
        eyebrow: '03 · Données interdites',
        title: 'Le tirage ignore qui est populaire.',
        introduction:
          'Ces signaux ne sont pas simplement ignorés par principe. Le moteur de sélection n’a pas le droit de les recevoir.',
        items: [
          'Paiement ou niveau d’abonnement',
          'Followers ou engagement',
          'Nombre de sessions ou score de contenu',
          'Sponsoring ou préférence administrative',
          'Quotas de nationalité ou langue',
          'Évaluation de la beauté, de la photo ou du profil',
        ],
      },
      consent: {
        eyebrow: '04 · Consentement et remplaçants',
        title: 'La sélection est une invitation, pas une obligation.',
        body: 'La personne principale dispose de 12 heures pour accepter. Refuser ou manquer la notification n’entraîne aucune sanction et la personne revient dans les groupes futurs.',
        sequence: [
          'Principale',
          'Remplaçant 1',
          'Remplaçant 2',
          'Remplaçant 3',
        ],
        note: 'Si personne ne peut participer, un nouveau tirage d’urgence utilise le même groupe figé et conserve le premier enregistrement. Personne n’est publié sans acceptation explicite.',
      },
      publication: {
        eyebrow: '05 · Avant publication',
        title: 'Être tiré au sort ne suffit pas pour être publié.',
        body: 'Au lancement, la personne qui accepte passe une preuve de vie et crée un portrait guidé. Des contrôles automatiques et une personne examinent le portrait avant publication.',
        quietDay:
          'Si personne n’a accepté et passé la modération avant l’échéance, Unumae affiche un Jour calme. Le produit n’invente jamais un Humain, ne contourne pas le consentement et ne publie rien sans relecture.',
      },
      audit: {
        eyebrow: '06 · Ce qui peut être vérifié',
        title: 'L’enregistrement permet de reproduire le tirage.',
        body: 'Le hash du groupe, la graine, l’ordre obtenu, les remplacements et la version du tirage sont conservés pour reconstruire et auditer la sélection.',
        note: 'La vérification cryptographique publique est un objectif futur de transparence, pas une fonction revendiquée par ce site avant lancement.',
      },
    },
    guidelines: {
      hero: {
        eyebrow: 'Règles de la communauté',
        title: 'Respecter la personne en face.',
        introduction:
          'C’est un petit espace avec une promesse simple : chaque jour, une personne ordinaire est présentée au monde. Ces règles rendent cela possible.',
      },
      canonicalNote:
        'Approuvées le 22 août 2026. La version anglaise fait foi. Une personne accepte ces règles avant d’entrer dans le tirage.',
      contentsLabel: 'Sur cette page',
      rules: [
        {
          title: 'Il y a une personne à la fois. Traitez-la comme telle.',
          paragraphs: [
            'L’Humain du jour n’est pas un contenu. C’est une personne qui a accepté d’être vue, une fois, par des inconnus. Elle a choisi de faire quelque chose que beaucoup trouveraient intimidant.',
            'Posez-lui la question que vous poseriez à une personne inconnue que vous respectez. Si vous ne le diriez pas dans la même pièce, ne l’envoyez pas ici.',
          ],
        },
        {
          title: 'Posez des questions. Ne prononcez pas de verdicts.',
          paragraphs: [
            'Vous pouvez tout demander. Vous ne pouvez pas utiliser une question pour porter un jugement sur quelqu’un—son pays, sa religion, son corps, ses opinions politiques ou sa vie.',
            'La différence est généralement évidente :',
          ],
          examples: [
            '« Que comprend-on mal de l’endroit où vous vivez ? » — une question.',
            '« Pourquoi votre pays est-il comme ça ? » — un verdict avec un point d’interrogation.',
          ],
          bullets: [
            'Nous retirons le second type. Non parce que le sujet est interdit, mais parce que ce n’était pas vraiment une question.',
          ],
        },
        {
          title: 'Personne n’est en compétition.',
          paragraphs: [
            'Il n’y a ni followers, ni scores, ni classements, ni moyen de payer pour obtenir de l’attention. Si vous êtes ici pour construire une audience, ce n’est pas le bon endroit, et rien de ce que nous ajouterons ne changera cela.',
            'N’utilisez ni questions, ni portraits, ni signalements pour promouvoir quoi que ce soit—vous-même, une entreprise, une cause ou une autre plateforme.',
          ],
        },
        {
          title: 'Dites la vérité sur votre identité.',
          paragraphs: [
            'Un compte par personne. Ne vous présentez pas comme quelqu’un d’autre, réel ou inventé, et ne participez pas au tirage au nom d’une autre personne.',
            'Si vous êtes sélectionné, l’histoire racontée doit être la vôtre. Vous pouvez omettre ce que vous voulez—c’est votre droit—mais ce que vous dites doit être vrai.',
          ],
        },
        {
          title: 'Certaines choses ne sont jamais permises.',
          paragraphs: [],
          bullets: [
            'Le harcèlement, les menaces ou le ciblage d’une personne ou d’un groupe',
            'La haine envers des personnes pour ce qu’elles sont',
            'Le contenu sexuel, et tout contenu sexuel impliquant des mineurs, que nous signalons aux autorités',
            'L’incitation à l’automutilation ou au suicide',
            'Le partage d’informations privées, y compris celles de l’Humain du jour—son domicile, son travail ou l’endroit où le trouver',
            'Toute tentative de contacter l’Humain du jour hors de l’application après l’avoir vu ici',
          ],
        },
        {
          title: 'Protégez la personne, pas la plateforme.',
          paragraphs: [
            'Si quelque chose vous inquiète, signalez-le. Les signalements sont lus par une personne.',
            'Signaler est gratuit, toujours disponible et ne vous sera jamais reproché. En cas de doute, signalez et laissez-nous décider—c’est notre travail, pas le vôtre.',
          ],
        },
        {
          title: 'Si vous êtes sélectionné',
          paragraphs: [
            'Nous vous demanderons, et vous pourrez dire non. Refuser ne coûte rien et n’affecte aucun tirage futur.',
            'Si vous acceptez :',
          ],
          bullets: [
            'Vous choisissez ce que vous partagez. Chaque partie du portrait au-delà du minimum est facultative, et aucune question n’exige de réponse.',
            'Votre pays est affiché. Vous pouvez garder secrets votre ville et votre âge exact.',
            'Une personne relit votre portrait avant sa publication.',
            'Vous pouvez ensuite demander son retrait des Archives, et nous le ferons.',
          ],
        },
        {
          title: 'Ce qui arrive quand les règles sont enfreintes',
          paragraphs: [
            'Dans l’ordre : le contenu est retiré, puis le compte suspendu, puis banni. Les atteintes graves—menaces, contenu sexuel impliquant des mineurs, harcèlement coordonné—passent directement à la dernière étape et, si nécessaire, aux autorités.',
            'Une personne bannie sort de tous les tirages futurs. Si elle avait déjà été publiée, son entrée dans les Archives est retirée.',
            'Vous pouvez contester une décision. Dites-le et une autre personne l’examinera.',
          ],
        },
        {
          title: 'Ces règles peuvent changer. La promesse, jamais.',
          paragraphs: [
            'Nous mettrons cette page à jour au fil de nos apprentissages. Le fond ne peut pas changer : aucun follower, aucun classement, aucun moyen d’acheter une meilleure chance, et une personne ordinaire par jour.',
          ],
        },
      ],
      updated: 'Dernière mise à jour : 22 août 2026.',
    },
  },
  de: {
    about: {
      hero: {
        eyebrow: 'Über Unumae',
        title: 'Einen Menschen wirklich sehen.',
        introduction:
          'Unumae ist ein täglicher Moment der Aufmerksamkeit. Ein gewöhnlicher Mensch erzählt eine endliche Geschichte; einen globalen Tag lang sind alle eingeladen, ihm zu begegnen.',
      },
      promise: {
        eyebrow: 'Das Versprechen',
        title: 'Gewöhnlich. Einer. Erinnert.',
        quote:
          'Jeden Tag wird ein gewöhnlicher Mensch aus der Community zum Menschen des Tages. Die Welt entdeckt 24 Stunden lang seine Geschichte, stellt Fragen und erinnert sich im Menschenarchiv.',
        commitments: [
          {
            term: 'Gewöhnlich',
            meaning:
              'Keine Auswahl nach Ruhm, Schönheit, Reichweite oder einer Vorstellung davon, wer interessant wirkt.',
          },
          {
            term: 'Einer',
            meaning:
              'Kein zweiter Platz, kein Zweitplatzierter und kein Strom konkurrierender Menschen daneben.',
          },
          {
            term: 'Erinnert',
            meaning:
              'Nach diesem Tag bleibt der Platz im Archiv bestehen—vorbehaltlich des Rechts, die eigene Geschichte entfernen zu lassen.',
          },
        ],
      },
      limits: {
        eyebrow: 'Grenzen mit Absicht',
        title: 'Die fehlenden Funktionen sind der Punkt.',
        introduction:
          'Unumae lehnt Mechanismen ab, die aus der Begegnung mit einem Menschen seine Bewertung machen.',
        items: [
          {
            title: 'Kein Publikum zum Ansammeln',
            body: 'Keine Follower, öffentlichen Beliebtheitszahlen, Ranglisten oder Bestenlisten.',
          },
          {
            title: 'Keine Aufmerksamkeit zum Kaufen',
            body: 'Zahlung, Sponsoring und bestehende Bekanntheit dürfen Auswahl oder Sichtbarkeit nie beeinflussen.',
          },
          {
            title: 'Kein privater Zugang',
            body: 'Es gibt keine Direktnachrichten. Sichtbarkeit darf kein Kanal für private Belästigung werden.',
          },
          {
            title: 'Kein endloser Konsum',
            body: 'Es gibt eine Geschichte, sie hat ein Ende, und das Erlebnis hört auf.',
          },
        ],
      },
      access: {
        eyebrow: 'Standardmäßig offen',
        title: 'Die Geschichte eines Menschen ist kein Anmeldetrick.',
        body: 'Der Mensch des Tages, das Porträt, die Fragen und das Menschenarchiv bleiben für Gäste offen. Lesen erfordert weder Konto noch App-Installation.',
        rights: [
          'Die ausgewählte Person kann ohne Folgen ablehnen.',
          'Sie entscheidet, was sie teilt und welche Fragen sie beantwortet.',
          'Sie darf Stadt, genaues Alter und Nachnamen zurückhalten.',
          'Sie darf die Entfernung ihrer Geschichte aus dem Archiv verlangen.',
        ],
      },
      international: {
        eyebrow: 'Vom ersten Tag an international',
        title: 'Nicht ein Zentrum, das nach außen blickt.',
        body: 'Überall gilt derselbe UTC-Tag. Nationalität beeinflusst die Ziehung nie; das Land ist Kontext, keine Punktzahl, Quote oder Wertung.',
        languageNote:
          'Die Oberfläche startet auf Englisch, Französisch und Deutsch. Die ursprünglichen Worte eines Menschen bleiben sichtbar, wenn Übersetzungen ergänzt werden.',
      },
      closing: {
        title: 'Faire Aufmerksamkeit beginnt mit einer fairen Ziehung.',
        body: 'Das Versprechen zählt nur, wenn jede berechtigte Person zu denselben Bedingungen teilnimmt.',
        link: 'So funktioniert die Auswahl',
      },
    },
    selection: {
      hero: {
        eyebrow: 'So funktioniert die Auswahl',
        title: 'Gleiche Chance heißt wirklich gleich.',
        introduction:
          'Die tägliche Ziehung ist von Beliebtheit, Zahlung, Nationalität und redaktionellem Geschmack getrennt. Berechtigung ist binär; niemand ist „mehr berechtigt“.',
      },
      facts: [
        { value: 'T−2', label: 'Pool um 00:00 UTC eingefroren' },
        { value: '1 + 3', label: 'Hauptperson und Ersatzpersonen' },
        { value: '12 Std.', label: 'Zeit zur freien Annahme' },
        { value: 'Einmal', label: 'ein Mensch, ein Tag, für immer' },
      ],
      eligibility: {
        eyebrow: '01 · Berechtigung',
        title: 'Im Pool, oder nicht.',
        introduction:
          'Beim Einfrieren des Pools müssen alle folgenden Bedingungen erfüllt sein. Es gibt weder Punktzahl noch Stufe.',
        criteria: [
          'Das Konto ist aktiv und per E-Mail oder Apple bestätigt.',
          'Das Konto ist mindestens sieben Tage alt.',
          'Die Person ist mindestens 16 Jahre alt.',
          'Die Community-Regeln wurden akzeptiert.',
          'Die Person hat sich für die Ziehung entschieden.',
          'Die Person war noch nie Mensch des Tages.',
        ],
        conclusion:
          'Alle, die denselben vollständigen Test bestehen, erhalten dieselbe Wahrscheinlichkeit.',
      },
      draw: {
        eyebrow: '02 · Die Ziehung',
        title: 'Zuerst eingefroren. Durchgehend festgehalten.',
        introduction:
          'Die Reihenfolge entsteht einmal aus einer unveränderlichen Momentaufnahme, nicht aus einer Live-Abfrage, die sich verschieben kann.',
        steps: [
          {
            time: 'T−2 · 00:00',
            title: 'Berechtigten Pool einfrieren',
            body: 'Ein Hash hält genau fest, wer enthalten ist. Wer eine Minute später berechtigt wird, wartet auf den nächsten Pool.',
          },
          {
            time: 'T−2 · 00:05',
            title: 'Sicheren Seed aufzeichnen',
            body: 'Der eingefrorene Pool und ein kryptographisch sicherer Zufalls-Seed werden ohne spätere Änderung gespeichert.',
          },
          {
            time: 'Ein Vorgang',
            title: 'Eine Haupt- und drei Ersatzpersonen ordnen',
            body: 'Das Ergebnis ist aus den aufgezeichneten Eingaben deterministisch und reproduzierbar.',
          },
          {
            time: 'Dauerhaft',
            title: 'Audit-Eintrag behalten',
            body: 'Abgebrochene Ziehungen und Ersetzungen bleiben erhalten; die Geschichte wird nicht umgeschrieben.',
          },
        ],
      },
      exclusions: {
        eyebrow: '03 · Verbotene Eingaben',
        title: 'Die Ziehung weiß nicht, wer beliebt ist.',
        introduction:
          'Diese Signale werden nicht nur aus Prinzip ignoriert. Die Auswahl-Engine darf sie nicht erhalten.',
        items: [
          'Zahlung oder Abonnementstufe',
          'Follower oder Engagement',
          'Sitzungszahl oder Inhaltsbewertungen',
          'Sponsoring oder Admin-Präferenz',
          'Nationalitätsquoten oder Sprache',
          'Bewertung von Schönheit, Foto oder Profilqualität',
        ],
      },
      consent: {
        eyebrow: '04 · Zustimmung und Ersatzpersonen',
        title: 'Die Auswahl ist eine Einladung, keine Pflicht.',
        body: 'Die Hauptperson hat 12 Stunden Zeit anzunehmen. Ablehnen oder eine Mitteilung zu verpassen hat keine Nachteile; die Person kehrt in spätere Pools zurück.',
        sequence: ['Hauptperson', 'Ersatz 1', 'Ersatz 2', 'Ersatz 3'],
        note: 'Kann niemand teilnehmen, nutzt eine Notfallziehung denselben eingefrorenen Pool und bewahrt den ersten Eintrag. Niemand wird ohne ausdrückliche Zustimmung veröffentlicht.',
      },
      publication: {
        eyebrow: '05 · Vor der Veröffentlichung',
        title: 'Ausgewählt zu sein reicht nicht, um live zu gehen.',
        body: 'Zum Start durchläuft die Person nach ihrer Zustimmung eine Lebendigkeitsprüfung und erstellt ein geführtes Porträt. Automatische Prüfungen und ein Mensch prüfen es vor der Veröffentlichung.',
        quietDay:
          'Hat bis zur Frist niemand zugesagt und die Prüfung bestanden, zeigt Unumae einen Stillen Tag. Es erfindet keinen Menschen, umgeht keine Zustimmung und veröffentlicht nichts ungeprüft.',
      },
      audit: {
        eyebrow: '06 · Was überprüfbar ist',
        title: 'Der Datensatz macht die Ziehung reproduzierbar.',
        body: 'Pool-Hash, Seed, geordnetes Ergebnis, Ersetzungen und Ziehungsversion bleiben erhalten, damit die Auswahl rekonstruiert und geprüft werden kann.',
        note: 'Öffentliche kryptographische Verifikation ist ein künftiges Transparenzziel, keine Funktion, die diese Vorab-Website behauptet.',
      },
    },
    guidelines: {
      hero: {
        eyebrow: 'Community-Regeln',
        title: 'Behandle Fremde mit Respekt.',
        introduction:
          'Dies ist ein kleiner Ort mit einem einfachen Versprechen: Jeden Tag wird der Welt ein gewöhnlicher Mensch vorgestellt. Diese Regeln machen das möglich.',
      },
      canonicalNote:
        'Beschlossen am 22. August 2026. Die englische Fassung ist maßgeblich. Vor der Teilnahme an der Ziehung stimmt eine Person diesen Regeln zu.',
      contentsLabel: 'Auf dieser Seite',
      rules: [
        {
          title: 'Hier ist jeweils ein Mensch. Behandle ihn auch so.',
          paragraphs: [
            'Der Mensch des Tages ist kein Inhalt. Es ist jemand, der zugestimmt hat, einmal von Fremden gesehen zu werden. Diese Person hat etwas gewählt, das viele Menschen beängstigend fänden.',
            'Frage, was du eine fremde Person fragen würdest, die du respektierst. Wenn du es ihr nicht im selben Raum sagen würdest, sende es hier nicht.',
          ],
        },
        {
          title: 'Stelle Fragen. Fälle keine Urteile.',
          paragraphs: [
            'Du kannst alles fragen. Du darfst eine Frage nicht benutzen, um eine Aussage über jemanden zu machen—über Land, Religion, Körper, Politik oder Leben.',
            'Der Unterschied ist meist offensichtlich:',
          ],
          examples: [
            '„Was verstehen Menschen an deinem Wohnort falsch?“ — eine Frage.',
            '„Warum ist dein Land so?“ — ein Urteil mit Fragezeichen.',
          ],
          bullets: [
            'Wir entfernen die zweite Art. Nicht weil das Thema verboten ist, sondern weil es keine echte Frage war.',
          ],
        },
        {
          title: 'Hier konkurriert niemand.',
          paragraphs: [
            'Es gibt keine Follower, Punktzahlen, Ranglisten und keine Möglichkeit, für Aufmerksamkeit zu bezahlen. Wer ein Publikum aufbauen will, ist hier falsch; nichts, was wir später ergänzen, wird das ändern.',
            'Nutze Fragen, Porträts oder Meldungen nicht, um etwas zu bewerben—dich selbst, ein Unternehmen, ein Anliegen oder eine andere Plattform.',
          ],
        },
        {
          title: 'Sag die Wahrheit darüber, wer du bist.',
          paragraphs: [
            'Ein Konto pro Person. Gib dich nicht als jemand anderes aus, ob real oder erfunden, und nimm nicht für jemand anderen an der Ziehung teil.',
            'Wenn du ausgewählt wirst, muss die erzählte Geschichte deine eigene sein. Du darfst alles auslassen—das ist dein Recht—aber was du sagst, muss wahr sein.',
          ],
        },
        {
          title: 'Manche Dinge sind niemals erlaubt.',
          paragraphs: [],
          bullets: [
            'Belästigung, Drohungen oder gezielte Angriffe auf eine Person oder Gruppe',
            'Hass gegen Menschen aufgrund ihrer Identität',
            'Sexuelle Inhalte und alle sexuellen Inhalte mit Minderjährigen, die wir den Behörden melden',
            'Ermutigung zu Selbstverletzung oder Suizid',
            'Weitergabe privater Informationen, auch über den Menschen des Tages—wo jemand lebt, arbeitet oder zu finden ist',
            'Versuche, den Menschen des Tages nach der Begegnung hier außerhalb der App zu kontaktieren',
          ],
        },
        {
          title: 'Schütze den Menschen, nicht die Plattform.',
          paragraphs: [
            'Wenn dich etwas hier beunruhigt, melde es. Meldungen werden von einem Menschen gelesen.',
            'Melden ist kostenlos, immer verfügbar und wird dir nie vorgehalten. Wenn du unsicher bist, melde es und lass uns entscheiden—das ist unsere Aufgabe, nicht deine.',
          ],
        },
        {
          title: 'Wenn du ausgewählt wirst',
          paragraphs: [
            'Du wirst gefragt und kannst Nein sagen. Eine Ablehnung kostet nichts und beeinflusst keine spätere Ziehung.',
            'Wenn du annimmst:',
          ],
          bullets: [
            'Du entscheidest, was du teilst. Jeder Teil des Porträts über das Minimum hinaus ist freiwillig, und keine Frage muss beantwortet werden.',
            'Dein Land wird gezeigt. Stadt und genaues Alter darfst du zurückhalten.',
            'Ein Mensch prüft dein Porträt vor der Veröffentlichung.',
            'Du kannst danach die Entfernung aus dem Archiv verlangen, und wir werden sie vornehmen.',
          ],
        },
        {
          title: 'Was geschieht, wenn Regeln gebrochen werden',
          paragraphs: [
            'Der Reihe nach: Inhalt wird entfernt, dann das Konto gesperrt, dann verboten. Schwerer Schaden—Drohungen, sexuelle Inhalte mit Minderjährigen, koordinierte Belästigung—führt direkt zum letzten Schritt und, wo erforderlich, zu den Behörden.',
            'Wer verboten wird, scheidet aus allen künftigen Ziehungen aus. War die Person bereits veröffentlicht, wird ihr Archiveintrag entfernt.',
            'Du kannst eine Entscheidung anfechten. Sag es, und ein anderer Mensch prüft sie.',
          ],
        },
        {
          title: 'Diese Regeln können sich ändern. Das Versprechen nicht.',
          paragraphs: [
            'Wir aktualisieren diese Seite, wenn wir dazulernen. Unveränderlich bleibt: keine Follower, keine Ranglisten, keine Möglichkeit, eine bessere Chance zu kaufen, und ein gewöhnlicher Mensch pro Tag.',
          ],
        },
      ],
      updated: 'Zuletzt aktualisiert am 22. August 2026.',
    },
  },
};
