# Vision produit figée avant de coder

Nom temporaire interne :

# **ONE HUMAN**

Positionnement :

> **8 billion people. One today.**

Concept :

> Every day, one ordinary person from the community becomes Today's Human. The world discovers their story for 24 hours, asks questions and remembers them forever in the Human Archive.

Principes non négociables :

* aucune logique de followers ;
* aucune compétition de popularité ;
* aucune possibilité de payer pour augmenter ses chances ;
* aucune priorité donnée aux influenceurs ;
* une chance équitable parmi les utilisateurs éligibles ;
* une seule personne principale par cycle ;
* découverte avant consommation infinie ;
* contenu humain avant contenu viral ;
* archive permanente ;
* internationalisation dès le début ;
* protection contre bots/fraude ;
* modération avant diffusion ;
* design extrêmement simple ;
* pas de feed TikTok-like.

---

# Architecture cible

Je construirais :

```text
iOS App
   │
   ├── Expo / React Native
   │
   ├── Expo Router
   │
   ├── TypeScript
   │
   └── Expo Notifications
   │
   ▼
Supabase
   │
   ├── Auth
   ├── PostgreSQL
   ├── Storage
   ├── Edge Functions
   ├── Realtime
   └── Row Level Security
   │
   ▼
Application Services
   ├── Daily selection engine
   ├── Eligibility engine
   ├── Moderation pipeline
   ├── Question ranking
   ├── Translation
   ├── Notifications
   └── Archive generator
```

Et plus tard :

```text
Admin Console
Analytics
Android
Web/PWA
RevenueCat
AI-assisted interview
Advanced moderation
```

---

# Correspondance 42 -> 18 phases

Cette version regroupe les 42 phases d'origine en 18 phases. Aucune ligne de contenu n'a été retirée : chaque ancienne phase reste présente en sous-section, avec son numéro d'origine.

| Nouvelle phase | Anciennes phases | Titre                                                  |
| -------------- | ---------------- | ------------------------------------------------------ |
| 0              | 0                | Product Constitution                                    |
| 1              | 1                | Foundation & project architecture                       |
| 2              | 2                | Design system + UX prototype                            |
| 3              | 3, 4             | Authentication & user profile                           |
| 4              | 5, 6             | Eligibility & daily selection engine                    |
| 5              | 7, 8             | Fairness, transparency & candidate notification         |
| 6              | 9                | Human Portrait Builder                                  |
| 7              | 10, 11, 12, 13   | Today's Human experience — questions, voting, Remember  |
| 8              | 14, 15, 16       | Human Archive, discovery & One Year Ago                 |
| 9              | 17, 18, 22, 23   | Trust & safety — moderation, admin, privacy, anti-bot   |
| 10             | 19, 20, 21       | Notifications, localization & translation               |
| 11             | 24, 25, 26       | Analytics, sharing & landing web                        |
| 12             | 27, 28           | Accessibility & offline/poor connectivity               |
| 13             | 29, 30           | Testing & App Store readiness                           |
| 14             | 31, 32, 33       | Internal Alpha, Private Beta & retention validation     |
| 15             | 34, 35           | First viral experiments & 1,000 users                   |
| 16             | 36, 37, 38, 39   | Scale (10,000 users) & AI features                      |
| 17             | 40, 41, 42       | Monetization, Android & full web/PWA                    |

---

# PHASE 0 — Product Constitution

Avant même Expo.

C'est une petite phase mais extrêmement importante.

## Objectif

Écrire les règles du produit pour empêcher le projet de devenir progressivement un réseau social traditionnel.

### À définir

**Today's Human**

* durée : 24 h ;
* fréquence : quotidienne ;
* timezone globale du cycle ;
* critères d'éligibilité ;
* comportement si la personne sélectionnée ne répond pas ;
* comportement si elle refuse ;
* comportement si elle est bannie ;
* fallback candidate.

### Participation

Un utilisateur peut :

* découvrir Today's Human ;
* lire son portrait ;
* proposer une question ;
* voter pour des questions ;
* Remember ;
* explorer l'archive ;
* s'inscrire au tirage.

Il ne peut pas :

* créer un feed personnel ;
* accumuler des followers ;
* promouvoir commercialement son profil ;
* acheter davantage de chances ;
* contacter arbitrairement Today's Human en privé.

### Sortie

Créer :

```text
PRODUCT_CONSTITUTION.md
```

Avec notamment :

```text
Core promise
Core loop
Non-goals
Selection fairness
Safety principles
Monetization principles
Content rules
```

---

# PHASE 1 — Foundation & project architecture

## Objectif

Créer une codebase extrêmement propre avant la première feature.

### Stack

* Expo SDK 57 ;
* React Native ;
* TypeScript strict ;
* Expo Router ;
* Supabase JS ;
* TanStack Query ;
* Zustand uniquement pour état local réellement global ;
* React Hook Form ;
* Zod ;
* i18next / expo-localization ;
* ESLint ;
* Prettier ;
* Vitest/Jest selon compatibilité ;
* Maestro plus tard pour E2E.

Expo Router fournit le routing file-based adapté iOS/Android/web. ([Expo Documentation][1])

### Structure

Je partirais sur quelque chose comme :

```text
src/
├── app/
│   ├── (auth)/
│   ├── (onboarding)/
│   ├── (tabs)/
│   ├── human/
│   ├── archive/
│   ├── settings/
│   └── _layout.tsx
│
├── components/
│   ├── ui/
│   ├── human/
│   ├── archive/
│   ├── questions/
│   └── shared/
│
├── features/
│   ├── auth/
│   ├── profiles/
│   ├── daily-human/
│   ├── selection/
│   ├── questions/
│   ├── reactions/
│   ├── archive/
│   ├── notifications/
│   ├── reports/
│   └── moderation/
│
├── hooks/
├── lib/
│   ├── supabase/
│   ├── analytics/
│   ├── notifications/
│   ├── validation/
│   └── errors/
│
├── stores/
├── types/
├── constants/
├── theme/
├── i18n/
└── utils/

supabase/
├── migrations/
├── functions/
├── seed.sql
└── config.toml

docs/
├── PRODUCT_CONSTITUTION.md
├── ARCHITECTURE.md
├── DATABASE.md
├── SECURITY.md
└── IMPLEMENTATION_PLAN.md
```

### Environnements

Dès le départ :

```text
development
staging
production
```

Pas un seul Supabase utilisé pour tout.

### CI

GitHub Actions :

* typecheck ;
* lint ;
* unit tests ;
* migration validation ;
* build checks.

### Done Phase 1

On doit pouvoir :

* démarrer l'app ;
* naviguer ;
* changer la langue ;
* afficher theme tokens ;
* se connecter à Supabase ;
* exécuter les tests ;
* construire une development build iOS.

---

# PHASE 2 — Design system + UX prototype

Je ne coderais toujours pas le produit entier.

On définit d'abord son identité.

## Style

Je recommande quelque chose de très minimal et humain.

Pas :

> SaaS dashboard.

Pas :

> réseau social flashy.

Plutôt :

**editorial + documentary + premium + calm.**

Une personne doit être la star, pas l'UI.

### Design tokens

Créer :

```text
colors
spacing
radius
typography
shadows
motion
breakpoints
```

### Composants fondamentaux

* Button
* Text
* Avatar
* HumanPortrait
* CountryBadge
* QuestionCard
* Timer
* EmptyState
* Skeleton
* Sheet
* Toast
* ErrorState
* LanguageSelector
* ReportAction

### Motion

Animation discrète uniquement.

Exemple important :

```text
Selecting tomorrow's human…
```

peut avoir une animation propre.

Mais pas de gamification casino.

---

# PHASE 3 — Authentication & user profile

> Regroupe les anciennes PHASE 3 (Authentication) et PHASE 4 (User profile).

## PHASE 3 — Authentication

Très faible friction.

### Méthodes

iOS :

#### prioritaire

**Sign in with Apple**

Puis éventuellement :

* email magic link ;
* Google.

Pas de password classique si possible.

#### Guest mode

Très important.

Je veux pouvoir ouvrir l'application et voir Today's Human **sans créer de compte**.

Compte requis seulement pour :

* voter ;
* poser une question ;
* Remember ;
* entrer dans le tirage.

C’est un point que je considère essentiel.

---

## PHASE 4 — User profile

Profil volontairement minimal.

### Champs

```text
id
username
display_name
birth_year
country_code
city_optional
languages
avatar
bio_short
created_at
selection_eligible
verification_level
account_status
```

Pas :

```text
followers
following
popularity_score
likes_received
```

Je bannirais même ces colonnes du schéma.

---

# PHASE 4 — Eligibility & daily selection engine

> Regroupe les anciennes PHASE 5 (Eligibility system) et PHASE 6 (Daily selection engine).

## PHASE 5 — Eligibility system

C'est une des parties les plus importantes.

Tout inscrit ne doit pas automatiquement entrer dans le tirage.

Il faut être :

```text
active
not banned
minimum age satisfied
profile completed
country known
human verification passed
accepted community rules
eligible_for_selection = true
```

Plus tard :

```text
recently active
not previously selected within X years
not duplicate identity
```

---

## PHASE 6 — Daily selection engine

Le cœur mathématique.

Je ne ferais surtout pas :

```sql
ORDER BY RANDOM()
LIMIT 1
```

et basta.

Il faut un système auditable.

### Daily draw table

```text
daily_draws

id
selection_date
draw_version
candidate_pool_hash
candidate_count
selected_user_id
backup_1
backup_2
backup_3
random_seed
selection_status
created_at
published_at
```

#### États

```text
scheduled
selected
awaiting_acceptance
accepted
content_review
ready
live
completed
cancelled
replacement_required
```

#### Procédure

J-2 :

```text
build eligibility pool
↓
freeze candidate pool
↓
generate secure random selection
↓
select primary + backups
```

J-2/J-1 :

```text
notify candidate
↓
candidate accepts
↓
creates portrait
↓
moderation
```

Jour J :

```text
Today's Human goes live
```

---

# PHASE 5 — Fairness, transparency & candidate notification

> Regroupe les anciennes PHASE 7 (Fairness & transparency) et PHASE 8 (Candidate notification).

## PHASE 7 — Fairness & transparency

Très important pour notre marque.

Nous devons être capables d'expliquer :

> pourquoi cette personne a été sélectionnée.

Sans révéler d'informations sensibles.

Créer une page :

## How selection works

Avec :

* sélection aléatoire ;
* aucun paiement ;
* aucun follower count ;
* aucun boost ;
* aucun sponsor ;
* critères d'éligibilité ;
* exclusions safety ;
* historical selection policy.

Plus tard on pourrait même publier une méthode cryptographiquement vérifiable.

Mais pas obligatoire pour MVP.

---

## PHASE 8 — Candidate notification

Notification :

## **You were selected.**

Pas encore :

> You are Today's Human

puisque le contenu doit être préparé.

L'utilisateur dispose par exemple de :

**12 heures**

pour accepter.

S'il refuse :

backup #1.

---

# PHASE 6 — Human Portrait Builder

> Ancienne PHASE 9 — Human Portrait Builder, inchangée.


Une des phases les plus importantes du produit.

Le Human ne doit pas simplement avoir une textbox vide.

Sinon :

> “Hi guys, I'm John.”

Mort.

Nous guidons l’histoire.

### Portrait

1. photo ;
2. mini introduction ;
3. where I'm from ;
4. today I feel ;
5. something I love ;
6. something people misunderstand ;
7. an ordinary moment I treasure ;
8. something I'd tell the world ;
9. optional audio/video.

Mais je limiterais probablement le MVP à **5–7 éléments**.

---

# PHASE 7 — Today's Human experience

> Regroupe les anciennes PHASE 10 (Today's Human experience), PHASE 11 (Questions), PHASE 12 (Voting) et PHASE 13 (Remember) : tout ce qui vit sur l'écran TODAY.

## PHASE 10 — Today's Human experience

Cœur de l'application.

Tab principal :

## TODAY

Structure :

```text
Human number
Country
First name
Age optional
Portrait
Story
Questions
Remember
Countdown
```

Exemple :

```text
HUMAN #0128

Aya
Kyoto, Japan

18:43:12 remaining
```

Puis le contenu.

Aucun scroll infini.

Tu arrives à la fin.

C'est fini.

Cette limitation fait partie du produit.

---

## PHASE 11 — Questions

Utilisateurs authentifiés :

```text
Ask
```

Question max :

par exemple 180 caractères.

#### Pipeline

```text
submitted
↓
automated moderation
↓
approved
↓
visible
↓
voting
↓
top questions
↓
Today's Human answers
```

Pas de commentaires sous commentaires au MVP.

Ça éviterait énormément de toxicité.

---

## PHASE 12 — Voting

Simple :

⬆️ **Ask this**

Pas downvote.

Pourquoi ?

Parce que downvote transforme rapidement la plateforme en jugement.

Backend :

```text
question_votes

question_id
user_id
created_at

UNIQUE(question_id, user_id)
```

---

## PHASE 13 — Remember

Notre seul équivalent émotionnel du Like.

Mais je ne montrerais probablement **pas le compteur public**.

L’utilisateur peut :

❤️ Remember this Human.

Dans son compte :

```text
Humans I remember
```

Cela transforme la mécanique de like en bibliothèque personnelle.

Très différent psychologiquement.

---

# PHASE 8 — Human Archive, discovery & One Year Ago

> Regroupe les anciennes PHASE 14 (Human Archive), PHASE 15 (Search / discovery) et PHASE 16 (One Year Ago).

## PHASE 14 — Human Archive

Une fois les 24 heures terminées :

Today's Human devient :

```text
Archived Human
```

Archive :

```text
Today
Yesterday
One year ago
Random Human
Country
Year
```

Pas de ranking :

```text
most liked
top human
viral
trending
```

C'est important.

---

## PHASE 15 — Search / discovery

Pas au MVP initial.

Mais première version :

```text
country
year
language
random
```

Exemple :

> Show me a random Human from South America.

Très sympa.

---

## PHASE 16 — One Year Ago

À partir d'un an :

notification :

> **One year ago today, the world met Maria.**

Excellent moteur de rétention longue durée.

Puis :

```text
5 years ago
10 years ago
```

Le produit gagne mécaniquement de la valeur avec le temps.

---

# PHASE 9 — Trust & safety

> Regroupe les anciennes PHASE 17 (Moderation architecture), PHASE 18 (Admin Console), PHASE 22 (Privacy & account safety) et PHASE 23 (Anti-bot / Proof of Humanity).

## PHASE 17 — Moderation architecture

À ne surtout pas repousser.

Créer dès maintenant :

```text
content_reports
moderation_events
moderation_decisions
user_blocks
account_flags
```

Modération :

#### Layer 1

validation locale.

#### Layer 2

automated content screening.

#### Layer 3

manual/admin review pour Today's Human.

#### Layer 4

community reports.

---

## PHASE 18 — Admin Console

Très important.

Je ferais une petite webapp séparée.

Fonctions :

```text
Today's Human queue
Candidate pool
Portrait preview
Approve / reject
Question moderation
Reports
Ban / suspend
Archive corrections
Daily draw status
Notification status
```

Pas besoin qu'elle soit belle.

Elle doit être fiable.

---

## PHASE 22 — Privacy & account safety

Il faudra prévoir :

* delete account ;
* export data ;
* hide city ;
* hide age ;
* report user ;
* block ;
* data retention ;
* consent ;
* media deletion ;
* GDPR ;
* App Store privacy labels.

La localisation précise ne doit **jamais** être obligatoire.

Pays suffit.

---

## PHASE 23 — Anti-bot / Proof of Humanity

Pas besoin de KYC au signup.

Progressif.

#### Signup

email/Apple.

#### Interactions

rate limiting.

#### Selection eligibility

plus strict :

* account age minimum ;
* activity ;
* device signals ;
* phone éventuellement ;
* liveness/selfie lorsque sélectionné.

Ainsi :

**faible friction pour découvrir, forte assurance uniquement lorsque nécessaire.**

---

# PHASE 10 — Notifications, localization & translation

> Regroupe les anciennes PHASE 19 (Push notifications), PHASE 20 (Localization) et PHASE 21 (Translation).

## PHASE 19 — Push notifications

Notifications limitées.

Je veux éviter :

> “COME BACK!!! 🔥🔥🔥”

Notifications légitimes :

#### Daily

> **Meet today's Human.**

#### Selected

> **You were selected.**

#### Question answered

> **Aya answered your question.**

#### Archive

éventuellement :

> **One year ago today…**

L'utilisateur contrôle chaque catégorie.

---

## PHASE 20 — Localization

Dès le MVP :

Je ferais au minimum :

```text
English
French
German
```

Parce que notre architecture doit être internationale immédiatement.

Mais **English est la langue canonique**.

Tous les strings :

```text
locales/en.json
locales/fr.json
locales/de.json
```

Jamais de texte UI hardcodé.

---

## PHASE 21 — Translation

Il y a deux niveaux.

#### UI

traduction traditionnelle.

#### User-generated content

Plus tard :

> Translate to English / French / German.

Je ne remplacerais jamais le texte original.

Affichage :

```text
Original
Translated
```

Très important culturellement.

---

# PHASE 11 — Analytics, sharing & landing web

> Regroupe les anciennes PHASE 24 (Analytics), PHASE 25 (Sharing) et PHASE 26 (Landing web).

## PHASE 24 — Analytics

Je veux des analytics produit dès Beta.

Événements :

```text
app_opened
today_viewed
portrait_completed
archive_opened
question_started
question_submitted
question_voted
human_remembered
signup_started
signup_completed
selection_accepted
selection_declined
notification_opened
share_started
share_completed
```

Pas seulement :

DAU / MAU.

KPI vraiment importants :

#### Activation

% qui terminent le portrait du jour.

#### Curiosity

% qui reviennent demain.

#### Human engagement

questions/viewer.

#### Memory

Remember/viewer.

#### Organic viral

shares/viewer.

---

## PHASE 25 — Sharing

Très important.

Créer des cards partageables.

Exemple :

```text
TODAY'S HUMAN

AYA
Japan 🇯🇵

"What is something people
misunderstand about your country?"

8 billion people.
One today.
```

Lien :

```text
onehuman.app/today
```

Deep link vers l’app si installée.

Sinon landing page web.

---

## PHASE 26 — Landing web

Même iOS-first, il nous faut une landing page.

Pas une vraie webapp au début.

Pages :

```text
/
today
about
how-selection-works
archive
privacy
terms
community-guidelines
```

Un lien partagé depuis TikTok/X/WhatsApp doit être compréhensible **sans installation préalable**.

Ça réduit énormément la friction virale.

---

# PHASE 12 — Accessibility & offline / poor connectivity

> Regroupe les anciennes PHASE 27 (Accessibility) et PHASE 28 (Offline & poor connectivity).

## PHASE 27 — Accessibility

Pas optionnel.

Prévoir :

* Dynamic Type ;
* VoiceOver ;
* contrastes ;
* reduced motion ;
* captions ;
* alt text ;
* haptic optional ;
* boutons taille adaptée.

Le concept vise potentiellement **8 milliards d'humains**.

L'accessibilité doit correspondre au positionnement.

---

## PHASE 28 — Offline & poor connectivity

Très important internationalement.

Today's Human doit pouvoir être :

```text
cached
```

Après chargement.

Images optimisées.

Lazy media.

Pas 50 MB de vidéo obligatoire.

Le produit doit fonctionner correctement sur connexion faible.

---

# PHASE 13 — Testing & App Store readiness

> Regroupe les anciennes PHASE 29 (Testing) et PHASE 30 (App Store readiness).

## PHASE 29 — Testing

#### Unit

* eligibility ;
* selection ;
* permissions ;
* validation ;
* countdown ;
* archive state.

#### Integration

* auth ;
* question ;
* voting ;
* candidate acceptance.

#### Security

* RLS ;
* privilege escalation ;
* duplicate voting ;
* unauthorized profile changes ;
* storage access.

Supabase recommande explicitement de revoir les politiques RLS avant production. ([Supabase][4])

#### E2E

Flux principal :

```text
visitor
→ view Human
→ sign up
→ ask
→ vote
→ remember
→ archive
```

Et :

```text
selected user
→ accept
→ build portrait
→ submit
→ approval
→ live
```

---

## PHASE 30 — App Store readiness

Avant Beta publique :

* bundle identifier ;
* icons ;
* launch screen ;
* privacy manifests ;
* permission copy ;
* privacy labels ;
* Sign in with Apple ;
* account deletion ;
* screenshots ;
* App Store description ;
* support URL ;
* privacy URL ;
* moderation/report flows ;
* age rating.

---

# PHASE 14 — Internal Alpha, Private Beta & retention validation

> Regroupe les anciennes PHASE 31 (Internal Alpha), PHASE 32 (Private Beta / First 100 Humans ecosystem) et PHASE 33 (Retention validation).

## PHASE 31 — Internal Alpha

Environ :

**10–20 utilisateurs.**

Pas de vrai tirage automatique public.

On simule plusieurs jours rapidement.

Objectif :

tester le loop.

Questions :

> Est-ce que Today's Human est intéressant ?

> Est-ce que les questions donnent envie ?

> Est-ce qu'on ouvre l'archive ?

> Est-ce que quelqu'un partage spontanément ?

---

## PHASE 32 — Private Beta / First 100 Humans ecosystem

Je viserais :

**100 utilisateurs actifs**, pas 10 000 téléchargements.

Le tirage devient réel.

Une personne chaque jour.

Au début :

1/100 chance.

C'est excellent.

Créer :

```text
Founding Humans
```

Mais pas avec avantages de sélection.

Simple badge historique :

> Joined during Year Zero.

---

## PHASE 33 — Retention validation

Avant toute grosse campagne marketing :

nous voulons voir :

#### D1

les utilisateurs reviennent-ils voir le prochain humain ?

#### D7

continuent-ils ?

#### Questions

est-ce qu'ils participent ou regardent seulement ?

#### Share rate

est-ce que le portrait sort de l'app ?

Si D1 est mauvais :

**on n'achète aucun utilisateur.**

On corrige le produit.

---

# PHASE 15 — First viral experiments & 1,000 users

> Regroupe les anciennes PHASE 34 (First viral experiments) et PHASE 35 (1,000 users).

## PHASE 34 — First viral experiments

Quelques hooks.

#### TikTok

> **Today, 12,000 people met this one stranger.**

#### Instagram

portrait humain.

#### X

citation de Today's Human.

#### Reddit

> We built a social network where nobody can have followers.

Cette formulation peut énormément intriguer.

---

## PHASE 35 — 1,000 users

À 1 000 utilisateurs :

commencer :

* archive exploration ;
* daily share cards ;
* international translation ;
* country representation ;
* selection transparency stats.

Exemple :

```text
1,042 Humans waiting
43 countries
137 languages
```

---

# PHASE 16 — Scale & AI features

> Regroupe les anciennes PHASE 36 (10,000 users), PHASE 37 (AI Interview Assistant), PHASE 38 (Human Story Engine) et PHASE 39 (Where Are They Now?).

## PHASE 36 — 10,000 users

Là commence la vraie infrastructure sociale.

Ajouter :

* meilleure anti-fraude ;
* stronger moderation ;
* backup candidate system ;
* automated translation ;
* country balance monitoring ;
* advanced notification orchestration ;
* moderation dashboard complet.

---

## PHASE 37 — AI Interview Assistant

Pas au MVP.

Mais probablement une feature majeure ensuite.

Quand tu es sélectionné :

> Tell me about yourself.

L'IA converse discrètement avec toi.

Elle détecte les éléments intéressants :

> You mentioned that your grandfather taught you to repair watches. Tell me more.

Puis aide l'utilisateur à transformer cela en portrait.

Important :

**l'IA n'écrit pas une fausse personnalité.**

Elle agit comme interviewer.

Cela pourrait devenir notre vraie technologie différenciante.

---

## PHASE 38 — Human Story Engine

Encore plus tard.

L'IA apprend :

> quelles questions permettent aux gens ordinaires de révéler quelque chose d'intéressant.

Par culture.

Par âge.

Par contexte.

Sans rechercher le clickbait.

Cela pourrait devenir un moat important.

---

## PHASE 39 — Where Are They Now?

Après suffisamment de temps :

```text
Human #231
2027

→ revisit in 2032
```

L'utilisateur compare :

```text
Then
Now
```

Probablement l'une des futures features les plus émotionnelles.

---

# PHASE 17 — Monetization, Android & full web/PWA

> Regroupe les anciennes PHASE 40 (Monetization), PHASE 41 (Android) et PHASE 42 (Full web/PWA).

## PHASE 40 — Monetization

Seulement après rétention démontrée.

Je protégerais absolument :

```text
Selection probability = NEVER monetized
```

Options :

#### Human Archive+

Fonctions avancées.

#### Yearbooks

Livres physiques :

> 365 Humans — 2027.

#### Documentary

stories.

#### institutional/education

exploration culturelle.

#### carefully controlled sponsorship

sans influence sur la sélection.

#### RevenueCat

Seulement à ce stade.

RevenueCat reste une bonne solution Expo pour subscriptions/IAP lorsqu'on en aura réellement besoin. ([RevenueCat][3])

---

## PHASE 41 — Android

À ce stade seulement.

Puisque React Native/Expo est déjà utilisé :

la majorité de la logique est partagée.

Tests spécifiques :

* notifications ;
* permissions ;
* back gestures ;
* push tokens ;
* media permissions ;
* store compliance.

---

## PHASE 42 — Full web/PWA

Le web public peut alors devenir :

> l'archive mondiale.

Très puissant SEO.

Chaque Human :

```text
/human/1842
```

Chaque date :

```text
/date/2027-08-22
```

Chaque pays :

```text
/country/cameroon
```

Mais contrairement à Kinavela, je ne chercherais pas ici à faire immédiatement de la PWA l'expérience principale. L’app native est le produit central ; le web sert d’abord la découverte, le partage et l’archive.

---

# Ordre de construction réellement recommandé

Les 18 phases — qui regroupent les 42 phases d'origine — ne signifient surtout pas que nous devons construire 18 choses avant lancement.

Je regrouperais le développement réel comme ceci :

| Macro phase                   | Contenu (18 phases) | Contenu (42 phases d'origine) | Launch blocker |
| ----------------------------- | ------------------- | ----------------------------- | -------------- |
| **A — Foundation**            | 0–3                 | 0–4                           | ✅              |
| **B — Core Engine**           | 4–6, début de 7     | 5–10                          | ✅              |
| **C — Social Loop**           | suite de 7, 8       | 11–16                         | ✅              |
| **D — Trust & Safety**        | 9–10                | 17–23                         | ✅              |
| **E — Growth Infrastructure** | 11–12               | 24–28                         | ✅              |
| **F — Quality & Store**       | 13                  | 29–30                         | ✅              |
| **G — Alpha/Beta**            | 14–15               | 31–35                         | ✅              |
| **H — Scale**                 | 16–17               | 36+                           | ❌ post-launch  |

La nouvelle PHASE 7 est à cheval sur B et C : l'écran TODAY (ancienne PHASE 10) appartient au Core Engine, questions/voting/Remember (anciennes PHASE 11–13) au Social Loop. C'est la seule frontière que le regroupement déplace.

Table d'origine conservée telle quelle, en numérotation 0–42 :

| Macro phase                   | Contenu | Launch blocker |
| ----------------------------- | ------- | -------------- |
| **A — Foundation**            | 0–4     | ✅              |
| **B — Core Engine**           | 5–10    | ✅              |
| **C — Social Loop**           | 11–16   | ✅              |
| **D — Trust & Safety**        | 17–23   | ✅              |
| **E — Growth Infrastructure** | 24–28   | ✅              |
| **F — Quality & Store**       | 29–30   | ✅              |
| **G — Alpha/Beta**            | 31–35   | ✅              |
| **H — Scale**                 | 36+     | ❌ post-launch  |

---

# Ce qui constitue réellement le MVP 1.0

Je serai très strict.

### MVP doit avoir

* guest viewing ;
* Apple/email auth ;
* minimal profile ;
* selection eligibility ;
* secure daily draw ;
* backup candidates ;
* Human acceptance ;
* Human Portrait Builder ;
* admin moderation ;
* Today's Human ;
* countdown ;
* questions ;
* voting ;
* Remember ;
* Human Archive ;
* report ;
* block ;
* push notifications ;
* EN/FR/DE ;
* share cards ;
* deep links ;
* analytics ;
* RLS/security ;
* legal pages ;
* App Store compliance.

### MVP ne doit PAS avoir

* followers ;
* DM ;
* comments ;
* reels ;
* stories ;
* groups ;
* rankings ;
* badges massifs ;
* creator monetization ;
* marketplace ;
* paywall ;
* RevenueCat ;
* AI interviewer ;
* advanced recommendations ;
* Android ;
* full PWA ;
* complex profiles ;
* social graph.

**Ce refus de features sera presque aussi important que ce que nous construisons.**

---

# Le core loop final

Je veux pouvoir réduire toute l'application à :

```text
OPEN
 ↓
MEET TODAY'S HUMAN
 ↓
DISCOVER THEIR STORY
 ↓
ASK / VOTE / REMEMBER
 ↓
SHARE
 ↓
24 HOURS
 ↓
NEW HUMAN
 ↓
RETURN
```

Et pour la personne sélectionnée :

```text
SELECTED
 ↓
ACCEPT
 ↓
TELL YOUR STORY
 ↓
MODERATION
 ↓
BECOME TODAY'S HUMAN
 ↓
ANSWER THE WORLD
 ↓
ENTER THE ARCHIVE
```
