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
        body: 'Your email address, and the profile you fill in: a username, a name, a year of birth, a country, and optionally a city and one line about you. If you are selected, the portrait you write and the photograph you choose. Questions you ask and the Journeys you remember.',
      },
      {
        title: 'One number about your app, not about you',
        body: 'After the app and device pass platform attestation, our server issues a short-lived random installation session so we can count how many people came back the next day and protect submission queues. It is not an advertising identifier, its secret is stored securely on your device, and analytics events are deleted after 90 days.',
      },
      {
        title: 'Account and device assurance',
        body: 'For draw eligibility we keep your confirmed normalized email and stable Apple or Google provider identifier while your account exists. Apple App Attest and DeviceCheck or Google Play Integrity verify the app and device. Raw attestation payloads and raw network addresses are never stored. An opaque abuse-prevention flag can remain at the platform and in our anti-abuse records after account deletion, without your user ID or personal information, so deleting and reinstalling cannot create another draw entry.',
      },
      {
        title: 'Website measurement without a profile',
        body: 'On this website, we count only when someone chooses the selection explainer, Archive, or mission page. An event contains only its name, source page, and language, and follows the same 90-day retention. We set no analytics cookie or identifier, send nothing to an advertising service, honor Global Privacy Control and Do Not Track, and never measure a person, story, question, Archive entry, or popularity.',
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
        body: 'Product analytics for 90 days. Account-linked assurance data is deleted with your account; the non-identifying platform device flag remains for abuse prevention. Draw and review audit records are retained without your provider identifier or normalized email. Daily draw records remain permanently so fairness stays checkable.',
      },
      {
        title: 'Your rights',
        body: 'You can download a structured export of the account data that applies to you, hide your city, leave the draw, delete your account, and ask to be removed from the Archive if you were published. The export identifies security fields and third-party identifiers withheld to protect abuse controls and other people. These controls are available inside the app; a person handles any broader legal access request.',
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
        body: 'You must be at least 16 under our birth-year rule, control the account you use, and not create or operate duplicate accounts. Provider and device checks deter duplicate draw entries but do not prove that every account maps to a globally unique person. You are responsible for what is done with your account.',
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
        body: 'The service may be interrupted or changed. Some days no Journey is published, and that is by design rather than a failure.',
      },
      {
        title: 'Ending it',
        body: 'You can delete your account at any time from inside the app. We may end an account that repeatedly breaks the rules, or that we are legally required to end.',
      },
      {
        title: 'Changes',
        body: 'We will update these terms as the product grows. The durable promise underneath is that people choose their boundaries, selection cannot be bought, Journeys do not turn popularity into status, and the daily flagship remains one person at a time.',
      },
    ],
  },
  fr: {
    privacy: [
      {
        title: 'Ce que nous collectons',
        body: "Votre adresse e-mail et le profil que vous remplissez : un nom d'utilisateur, un nom, une année de naissance, un pays, et éventuellement une ville et une ligne sur vous. Si vous êtes sélectionné, le portrait que vous écrivez et la photo que vous choisissez. Les questions que vous posez et les Journeys dont vous vous souvenez.",
      },
      {
        title: 'Un numéro sur votre application, pas sur vous',
        body: 'Après l’attestation de l’application et de l’appareil, notre serveur émet une session d’installation aléatoire et temporaire pour compter les retours et protéger les files d’envoi. Ce n’est pas un identifiant publicitaire, son secret reste dans le stockage sécurisé de l’appareil et les événements sont supprimés après 90 jours.',
      },
      {
        title: 'Assurance du compte et de l’appareil',
        body: 'Pour le tirage, nous conservons l’e-mail normalisé confirmé et l’identifiant Apple ou Google stable tant que le compte existe. App Attest et DeviceCheck d’Apple ou Play Integrity de Google vérifient l’application et l’appareil. Aucun justificatif brut ni adresse réseau brute n’est stocké. Un indicateur opaque anti-abus peut rester chez la plateforme et dans nos registres anti-abus après suppression, sans identifiant utilisateur ni information personnelle, afin d’empêcher un nouveau ticket par réinstallation.',
      },
      {
        title: 'Mesure du site sans créer de profil',
        body: 'Sur ce site, nous comptons uniquement le choix d’ouvrir l’explication de la sélection, les Archives ou la page de mission. Un événement contient seulement son nom, la page d’origine et la langue, avec la même conservation de 90 jours. Aucun cookie ni identifiant analytique, aucun service publicitaire ; nous respectons Global Privacy Control et Do Not Track et ne mesurons jamais une Journey, une histoire, une question, une entrée des Archives ou sa popularité.',
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
        body: 'Les statistiques produit sont conservées 90 jours. Les données d’assurance liées au compte sont supprimées avec lui ; l’indicateur opaque de plateforme reste pour prévenir les abus. Les audits de tirage et d’examen restent sans identifiant fournisseur ni e-mail normalisé.',
      },
      {
        title: 'Vos droits',
        body: "Vous pouvez télécharger un export structuré des données de compte qui vous concernent, masquer votre ville, quitter le tirage, supprimer votre compte et demander votre retrait de l'Archive. L’export signale les champs de sécurité et identifiants tiers masqués pour protéger les contrôles anti-abus et les autres personnes. Une personne traite toute demande légale d’accès plus large.",
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
        body: 'Vous devez avoir au moins 16 ans selon notre règle d’année de naissance, contrôler le compte utilisé et ne pas créer ni utiliser de comptes en double. Les contrôles de fournisseur et d’appareil découragent les doublons sans prouver qu’un compte correspond à une personne mondialement unique.',
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
        body: "Le service peut être interrompu ou modifié. Certains jours, aucune Journey n'est publiée : c'est voulu, pas une panne.",
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
        body: 'Deine E-Mail-Adresse und das Profil, das du ausfüllst: Benutzername, Name, Geburtsjahr, Land und optional Stadt und eine Zeile über dich. Wirst du ausgewählt, das Porträt, das du schreibst, und das Foto, das du wählst. Deine Fragen und die Journeys, an die du dich erinnerst.',
      },
      {
        title: 'Eine Zahl über deine App, nicht über dich',
        body: 'Nach der Plattformprüfung von App und Gerät stellt unser Server eine kurzlebige zufällige Installationssitzung aus, um Wiederkehr zu zählen und Eingabewarteschlangen zu schützen. Sie ist keine Werbekennung, ihr Geheimnis bleibt im sicheren Gerätespeicher und Analytik-Ereignisse werden nach 90 Tagen gelöscht.',
      },
      {
        title: 'Konto- und Geräteprüfung',
        body: 'Für die Auswahl speichern wir die bestätigte normalisierte E-Mail und die stabile Apple- oder Google-Anbieterkennung, solange das Konto besteht. Apple App Attest und DeviceCheck oder Google Play Integrity prüfen App und Gerät. Rohe Attestierungsdaten und rohe Netzwerkadressen werden nie gespeichert. Ein undurchsichtiges Missbrauchsflag kann nach Kontolöschung beim Plattformanbieter und in unseren Missbrauchsschutz-Datensätzen bleiben, ohne Nutzer-ID oder personenbezogene Daten, damit Neuinstallation keinen weiteren Eintrag erzeugt.',
      },
      {
        title: 'Website-Messung ohne Profil',
        body: 'Auf dieser Website zählen wir nur, wenn jemand die Auswahlerklärung, das Archiv oder die Missionsseite öffnet. Ein Ereignis enthält nur seinen Namen, die Ausgangsseite und die Sprache und wird ebenfalls 90 Tage aufbewahrt. Wir setzen weder Analyse-Cookie noch Kennung, senden nichts an Werbedienste, beachten Global Privacy Control und Do Not Track und messen niemals einen Menschen, eine Geschichte, eine Frage, einen Archiveintrag oder Beliebtheit.',
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
        body: 'Produktdaten bleiben 90 Tage. Kontoverknüpfte Prüfdaten werden mit dem Konto gelöscht; das nicht identifizierende Plattform-Geräteflag bleibt zur Missbrauchsprävention. Auswahl- und Prüfaudits bleiben ohne Anbieterkennung oder normalisierte E-Mail erhalten.',
      },
      {
        title: 'Deine Rechte',
        body: 'Du kannst einen strukturierten Export der dich betreffenden Kontodaten herunterladen, deine Stadt verbergen, die Auswahl verlassen, dein Konto löschen und die Entfernung aus dem Archiv beantragen. Der Export nennt Sicherheitsfelder und Drittkennungen, die zum Schutz der Missbrauchskontrollen und anderer Personen zurückgehalten werden. Weitergehende gesetzliche Auskunftsanfragen bearbeitet ein Mensch.',
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
        body: 'Du musst nach unserer Geburtsjahrregel mindestens 16 sein, dein verwendetes Konto kontrollieren und darfst keine Doppelkonten erstellen oder betreiben. Anbieter- und Geräteprüfungen erschweren Doppeleinträge, beweisen aber keine weltweit eindeutige Person.',
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
        body: 'Der Dienst kann unterbrochen oder geändert werden. An manchen Tagen wird keine Journey veröffentlicht — so gewollt, kein Fehler.',
      },
      {
        title: 'Beenden',
        body: 'Du kannst dein Konto jederzeit in der App löschen. Wir können ein Konto beenden, das wiederholt gegen die Regeln verstößt oder das wir rechtlich beenden müssen.',
      },
      {
        title: 'Änderungen',
        body: 'Wir aktualisieren diese Bedingungen, während das Produkt wächst. Das dauerhafte Versprechen darunter ist: Menschen bestimmen ihre Grenzen, die Auswahl ist nicht käuflich, Journeys machen Popularität nicht zum Status, und die tägliche Flagship-Journey bleibt auf eine Person fokussiert.',
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
