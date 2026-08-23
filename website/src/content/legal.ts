import type { Locale, PageKey } from './site';

/**
 * The long-form legal text: privacy and terms.
 *
 * Kept out of site.ts on purpose: this is the copy that gets reviewed, and a
 * reviewer should not have to read past navigation labels to find it. The
 * three languages were transferred from the app, which shipped them first.
 *
 * About, how selection works and the community guidelines are NOT here — they
 * are richer than a list of sections and live in trust.ts, rendered by
 * TrustPage.
 *
 * The English text governs in any conflict (Product Constitution, Article 9.6).
 */
export interface LegalSection {
  title: string;
  body: string;
}

export const legalSections: Record<
  Locale,
  Partial<Record<PageKey, readonly LegalSection[]>>
> = {
  en: {
    privacy: [
      {
        title: 'What we collect',
        body: 'Your email address, and the profile you fill in: a username, a name, a year of birth, a country, and optionally a city and one line about you. If you are selected, the portrait you write and the photograph you choose. Questions you ask and the Humans you remember.',
      },
      {
        title: 'One number about your app, not about you',
        body: 'We store a random identifier for your installation, so we can count how many people came back the next day. It is not linked to any advertising profile, it never leaves our database, and it is deleted after 90 days along with the events it belongs to.',
      },
      {
        title: 'What we never collect',
        body: 'Your precise location — a country is the only place we ask for, and never automatically. Your contacts. Your activity in other apps or on other websites. Anything for advertising: there are no adverts here and no advertising partners.',
      },
      {
        title: 'Who sees it',
        body: 'Your profile is private to you. If you are published, your first name, country, optional city, photograph and portrait become public — that is the point, and you agree to it before it happens. Nobody else can read your library, your votes, or which draws you entered.',
      },
      {
        title: 'How long we keep it',
        body: 'Product analytics for 90 days. Everything else until you delete your account. Records of the daily draw are kept permanently, but they contain no published content — they are what makes the fairness of the draw checkable.',
      },
      {
        title: 'Your rights',
        body: 'You can export everything we hold about you, hide your city, leave the draw, delete your account, and ask to be removed from the Archive if you were published. All of it from inside the app, without asking anyone.',
      },
      {
        title: 'Age',
        body: 'You must be at least 16 to hold an account. We ask for a year of birth to check that, and for nothing else.',
      },
      {
        title: 'Questions',
        body: 'Write to us and a person will answer. We do not use an automated system for privacy requests.',
      },
    ],
    terms: [
      {
        title: 'What this is',
        body: 'A service that publishes one randomly chosen person each day, for 24 hours, and keeps an archive of everyone published. It is provided as it is, and it is free.',
      },
      {
        title: 'Your account',
        body: 'One account per person, at least 16 years old, with a real email address you control. You are responsible for what is done with your account.',
      },
      {
        title: 'Your content stays yours',
        body: 'Your portrait, your answers and your questions belong to you. We claim no ownership of them.',
      },
      {
        title: 'What you allow us to do with it',
        body: 'By submitting a portrait you allow us to publish it in the app and on our website, and to keep it in the Archive. That permission ends if you ask to be removed, except for the number and date, which remain so the Archive stays a complete sequence.',
      },
      {
        title: 'Being published',
        body: 'Nobody is published without saying yes. You choose what to share, you may decline with no consequence, and a person reviews every portrait before it appears.',
      },
      {
        title: 'What we may do',
        body: 'Remove content that breaks the community rules, suspend or end an account, and refuse to publish a portrait. Where we act, we record who decided and why, and you may dispute it.',
      },
      {
        title: 'No promises about availability',
        body: 'The service may be interrupted or changed. Some days no Human is published, and that is by design rather than a failure.',
      },
      {
        title: 'Ending it',
        body: 'You can delete your account at any time from inside the app. We may end an account that repeatedly breaks the rules, or that we are legally required to end.',
      },
      {
        title: 'Changes',
        body: 'We will update these terms as the product grows. What cannot change is the promise underneath: no followers, no rankings, no way to buy a better chance, and one ordinary person a day.',
      },
    ],
  },
  fr: {
    privacy: [
      {
        title: 'Ce que nous collectons',
        body: "Votre adresse e-mail et le profil que vous remplissez : un nom d'utilisateur, un nom, une année de naissance, un pays, et éventuellement une ville et une ligne sur vous. Si vous êtes sélectionné, le portrait que vous écrivez et la photo que vous choisissez. Les questions que vous posez et les Humans dont vous vous souvenez.",
      },
      {
        title: 'Un numéro sur votre application, pas sur vous',
        body: "Nous stockons un identifiant aléatoire pour votre installation, afin de compter combien de personnes reviennent le lendemain. Il n'est lié à aucun profil publicitaire, ne quitte jamais notre base, et est supprimé au bout de 90 jours avec les événements concernés.",
      },
      {
        title: 'Ce que nous ne collectons jamais',
        body: "Votre localisation précise — le pays est le seul lieu demandé, et jamais automatiquement. Vos contacts. Votre activité dans d'autres applications ou sur d'autres sites. Quoi que ce soit à des fins publicitaires : il n'y a ici ni publicité ni partenaire publicitaire.",
      },
      {
        title: 'Qui le voit',
        body: "Votre profil vous est privé. Si vous êtes publié, votre prénom, votre pays, votre ville éventuelle, votre photo et votre portrait deviennent publics — c'est le principe, et vous l'acceptez avant. Personne ne peut lire votre bibliothèque, vos votes, ni les tirages auxquels vous avez participé.",
      },
      {
        title: 'Combien de temps',
        body: "Les statistiques produit pendant 90 jours. Le reste jusqu'à la suppression de votre compte. Les enregistrements du tirage quotidien sont conservés indéfiniment, mais ne contiennent aucun contenu publié — ce sont eux qui rendent l'équité vérifiable.",
      },
      {
        title: 'Vos droits',
        body: "Exporter tout ce que nous détenons sur vous, masquer votre ville, quitter le tirage, supprimer votre compte, et demander votre retrait de l'Archive si vous avez été publié. Tout cela depuis l'application, sans demander à personne.",
      },
      {
        title: 'Âge',
        body: "Vous devez avoir au moins 16 ans. Nous demandons une année de naissance pour le vérifier, et pour rien d'autre.",
      },
      {
        title: 'Questions',
        body: "Écrivez-nous et une personne vous répondra. Nous n'utilisons pas de système automatisé pour les demandes de confidentialité.",
      },
    ],
    terms: [
      {
        title: "Ce que c'est",
        body: 'Un service qui publie chaque jour une personne tirée au hasard, pendant 24 heures, et conserve une archive de toutes les personnes publiées. Fourni tel quel, et gratuit.',
      },
      {
        title: 'Votre compte',
        body: 'Un compte par personne, au moins 16 ans, avec une adresse e-mail réelle que vous contrôlez. Vous êtes responsable de ce qui est fait avec votre compte.',
      },
      {
        title: 'Votre contenu reste le vôtre',
        body: 'Votre portrait, vos réponses et vos questions vous appartiennent. Nous n’en revendiquons aucune propriété.',
      },
      {
        title: 'Ce que vous nous autorisez à en faire',
        body: "En soumettant un portrait, vous nous autorisez à le publier dans l'application et sur notre site, et à le conserver dans l'Archive. Cette autorisation prend fin si vous demandez votre retrait, à l'exception du numéro et de la date, qui restent afin que l'Archive demeure une séquence complète.",
      },
      {
        title: 'Être publié',
        body: "Personne n'est publié sans avoir dit oui. Vous choisissez ce que vous partagez, vous pouvez refuser sans conséquence, et une personne relit chaque portrait avant sa parution.",
      },
      {
        title: 'Ce que nous pouvons faire',
        body: 'Retirer un contenu contraire aux règles, suspendre ou fermer un compte, et refuser de publier un portrait. Lorsque nous agissons, nous enregistrons qui a décidé et pourquoi, et vous pouvez contester.',
      },
      {
        title: 'Aucune promesse de disponibilité',
        body: "Le service peut être interrompu ou modifié. Certains jours, aucun Human n'est publié : c'est voulu, pas une panne.",
      },
      {
        title: 'Y mettre fin',
        body: "Vous pouvez supprimer votre compte à tout moment depuis l'application. Nous pouvons fermer un compte qui enfreint les règles de façon répétée, ou que la loi nous oblige à fermer.",
      },
      {
        title: 'Modifications',
        body: "Nous mettrons ces conditions à jour à mesure que le produit évolue. Ce qui ne peut pas changer, c'est la promesse en dessous : pas d'abonnés, pas de classements, aucun moyen d'acheter une meilleure chance, et une personne ordinaire par jour.",
      },
    ],
  },
  de: {
    privacy: [
      {
        title: 'Was wir erheben',
        body: 'Deine E-Mail-Adresse und das Profil, das du ausfüllst: Benutzername, Name, Geburtsjahr, Land und optional Stadt und eine Zeile über dich. Wirst du ausgewählt, das Porträt, das du schreibst, und das Foto, das du wählst. Deine Fragen und die Humans, an die du dich erinnerst.',
      },
      {
        title: 'Eine Zahl über deine App, nicht über dich',
        body: 'Wir speichern eine zufällige Kennung für deine Installation, um zu zählen, wie viele Menschen am nächsten Tag wiederkommen. Sie ist mit keinem Werbeprofil verknüpft, verlässt unsere Datenbank nie und wird nach 90 Tagen zusammen mit den Ereignissen gelöscht.',
      },
      {
        title: 'Was wir nie erheben',
        body: 'Deinen genauen Standort — nur das Land, und nie automatisch. Deine Kontakte. Deine Aktivität in anderen Apps oder auf anderen Websites. Irgendetwas für Werbung: Hier gibt es keine Werbung und keine Werbepartner.',
      },
      {
        title: 'Wer es sieht',
        body: 'Dein Profil ist privat. Wirst du veröffentlicht, werden Vorname, Land, optionale Stadt, Foto und Porträt öffentlich — das ist der Sinn, und du stimmst vorher zu. Niemand sonst kann deine Bibliothek, deine Stimmen oder deine Teilnahmen sehen.',
      },
      {
        title: 'Wie lange',
        body: 'Produktdaten 90 Tage. Alles andere, bis du dein Konto löschst. Die Aufzeichnungen der täglichen Auswahl bleiben dauerhaft, enthalten aber keinen veröffentlichten Inhalt — sie machen die Fairness überprüfbar.',
      },
      {
        title: 'Deine Rechte',
        body: 'Alles exportieren, was wir über dich haben, deine Stadt verbergen, die Auswahl verlassen, dein Konto löschen und um Entfernung aus dem Archiv bitten, falls du veröffentlicht wurdest. Alles in der App, ohne jemanden zu fragen.',
      },
      {
        title: 'Alter',
        body: 'Du musst mindestens 16 sein. Wir fragen nach dem Geburtsjahr, um das zu prüfen, und für nichts anderes.',
      },
      {
        title: 'Fragen',
        body: 'Schreib uns, und ein Mensch antwortet. Für Datenschutzanfragen nutzen wir kein automatisches System.',
      },
    ],
    terms: [
      {
        title: 'Was das ist',
        body: 'Ein Dienst, der täglich eine zufällig gewählte Person für 24 Stunden veröffentlicht und ein Archiv aller Veröffentlichten führt. Er wird so bereitgestellt, wie er ist, und ist kostenlos.',
      },
      {
        title: 'Dein Konto',
        body: 'Ein Konto pro Person, mindestens 16 Jahre alt, mit einer echten E-Mail-Adresse, die dir gehört. Du bist verantwortlich für das, was mit deinem Konto geschieht.',
      },
      {
        title: 'Deine Inhalte bleiben deine',
        body: 'Dein Porträt, deine Antworten und deine Fragen gehören dir. Wir beanspruchen kein Eigentum daran.',
      },
      {
        title: 'Was du uns damit erlaubst',
        body: 'Mit dem Einreichen eines Porträts erlaubst du uns, es in der App und auf unserer Website zu veröffentlichen und im Archiv zu behalten. Diese Erlaubnis endet, wenn du um Entfernung bittest — außer für Nummer und Datum, die bleiben, damit das Archiv eine vollständige Folge bleibt.',
      },
      {
        title: 'Veröffentlicht werden',
        body: 'Niemand wird ohne Zusage veröffentlicht. Du entscheidest, was du teilst, du darfst folgenlos ablehnen, und ein Mensch prüft jedes Porträt vorher.',
      },
      {
        title: 'Was wir tun dürfen',
        body: 'Inhalte entfernen, die gegen die Richtlinien verstoßen, ein Konto sperren oder beenden und ein Porträt nicht veröffentlichen. Wo wir handeln, halten wir fest, wer entschieden hat und warum, und du kannst widersprechen.',
      },
      {
        title: 'Keine Zusagen zur Verfügbarkeit',
        body: 'Der Dienst kann unterbrochen oder geändert werden. An manchen Tagen wird kein Human veröffentlicht — so gewollt, kein Fehler.',
      },
      {
        title: 'Beenden',
        body: 'Du kannst dein Konto jederzeit in der App löschen. Wir können ein Konto beenden, das wiederholt gegen die Regeln verstößt oder das wir rechtlich beenden müssen.',
      },
      {
        title: 'Änderungen',
        body: 'Wir aktualisieren diese Bedingungen, während das Produkt wächst. Was nicht änderbar ist, ist das Versprechen darunter: keine Follower, keine Ranglisten, kein Kaufen einer besseren Chance, und ein gewöhnlicher Mensch pro Tag.',
      },
    ],
  },
};

export function sectionsFor(
  locale: Locale,
  page: PageKey
): readonly LegalSection[] {
  return legalSections[locale][page] ?? [];
}

/** When the published text last changed. Shown at the foot of each page. */
export const legalLastUpdated = '23 August 2026';
