# App Store readiness

What review will ask for, what is already true, and what still needs a person.

---

## Answers you can copy

### Privacy labels — "Data Used to Track You"

**None.** Nothing here follows anybody across other apps or websites. There is
no advertising SDK, no attribution SDK, no data broker, and
`NSPrivacyTracking` is `false` in the manifest. Do not tick anything on this
screen.

### Privacy labels — "Data Linked to You"

| Category | Item | Purpose |
| --- | --- | --- |
| Contact Info | Email Address | App Functionality |
| Contact Info | Name | App Functionality |
| User Content | Photos or Videos | App Functionality |
| User Content | Other User Content | App Functionality |
| Identifiers | Device ID | Analytics |
| Usage Data | Product Interaction | Analytics |

**Device ID** is the random per-installation identifier described in
`docs/OPEN_ITEMS.md` and on the privacy page. It is declared as *linked*
because once somebody signs in it sits in the same row as their user id.
Declaring it unlinked would be a technicality rather than the truth.

### Privacy labels — "Data Not Collected"

Location, contacts, health, financial info, browsing history, search history,
sensitive info, purchases. None of it is collected, and there is no column for
most of it.

The country on a profile is **typed by the person**, not read from the device.
It is not Location data and should not be declared as such.

### Age rating

**12+.** The questionnaire answers that produce it:

| Question | Answer | Why |
| --- | --- | --- |
| User-generated content | **Yes** | Portraits and questions |
| Content moderation | **Yes** | Every portrait is reviewed by a person before publication; questions are reviewed before they appear |
| Ability to report content | **Yes** | On every published portrait and question |
| Ability to block users | **Yes** | Settings and the report sheet |
| Contact information sharing | **No** | There is no DM and no way to exchange contact details |
| Unrestricted web access | **No** | The only outbound links are our own pages |
| Gambling, contests | **No** | The draw has no stake, entry fee or prize |

The minimum account age is **16** and enforced by a database trigger, which is
stricter than the rating requires.

### The draw is not a sweepstake

If review queries it: there is no entry fee, no purchase, no prize of value,
and no way to improve odds by any means including payment. Being selected
grants the ability to publish a portrait for 24 hours and nothing else.
`docs/PRODUCT_CONSTITUTION.md` Article 10.1 forbids monetising selection
probability, and the code has no mechanism to.

### Required URLs

| Field | Value |
| --- | --- |
| Privacy Policy URL | `https://unumae.app/privacy` |
| Support URL | `https://unumae.app/about` |
| Marketing URL | `https://unumae.app` |

All three are served by `website/`, which must be deployed before submission.

### Account deletion

Required for any app offering sign-up. It is in **Settings → Delete my
account**, reachable in two taps from the main screen, and it deletes rather
than deactivates. The `delete-account` Edge Function is deployed.

Point review at that path directly; they check for it.

### Sign in with Apple

Offered, and required to be offered because the app also has a third-party
sign-in path. Configured for `com.unumae.app`.

---

## What is already true

| Requirement | State |
| --- | --- |
| Bundle identifier | `com.unumae.app` |
| Sign in with Apple | Implemented, provider enabled, Client ID confirmed |
| Account deletion in-app | Implemented and deployed |
| Report content | On portraits and questions |
| Block a user | Implemented; blocked people vanish from your view |
| Moderation before publication | Enforced in the database, not by policy |
| Privacy manifest | In `app.config.ts` |
| Permission strings | Photo library string written and translated |
| Age gate | 16, enforced by trigger |
| Privacy policy reachable | Links out to the site from Settings |

## What still needs a person

| Item | Why it cannot be done here |
| --- | --- |
| **App icon** | 1024×1024, no transparency, no rounded corners. A design decision, not a generated placeholder. |
| **Launch screen** | Currently the default. Should be the wordmark on `#FFFFFF` / `#0B0B0C`. |
| **Screenshots** | 6.7" and 6.5" required. They need a real published Human, so they come after the first live cycle. |
| **Description and keywords** | Marketing copy; the site's homepage is the natural source. |
| **Deploy the website** | The three URLs above must resolve before submission. |
| **First build** | `eas build --profile production --platform ios` |

Once the icon and launch screen exist as files, add them to `app.config.ts`:

```ts
icon: './assets/icon.png',
splash: { image: './assets/splash.png', backgroundColor: '#FFFFFF' },
```

## Rejections worth anticipating

**"We were unable to locate account deletion."** Give the exact path in the
review notes: Settings → Delete my account.

**"Your app includes a sweepstake."** Point at Article 10.1 and note there is
no entry fee, no prize and no purchasable advantage.

**"User-generated content requires moderation."** Every portrait is reviewed by
a person before it can be published; `publish_due_cycles()` refuses to publish
one that has not been. Questions are `pending` until approved. Reporting and
blocking are both present.

**A Quiet Day during review.** If no cycle is live, the app shows an honest
empty state rather than content. Say so in the review notes, or arrange for a
published Human on the review date.
