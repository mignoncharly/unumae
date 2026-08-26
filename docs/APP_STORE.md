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
| Identifiers | User ID | App Functionality |
| Identifiers | Device ID | App Functionality, Analytics |
| Location | Coarse Location | App Functionality |
| Other Data | Other Data Types | App Functionality |
| Usage Data | Product Interaction | Analytics |

**Device ID** covers the random per-installation identifier and platform
attestation state. **User ID** covers the Supabase account id and stable
Apple/Google provider identifier. Both are linked while the account exists;
the opaque platform flag and database abuse record retained after deletion
have no user link.

Country and optional city are typed by the person and never read from Location
Services, but they still describe coarse location and are declared that way.
Other Data Types covers birth year, assurance state, and account/moderation
status.

### Privacy labels — "Data Not Collected"

Precise location, contacts, health, financial info, browsing history, search
history, sensitive info, and purchases are not collected.

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

All three are live and were verified on 23 August 2026.

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
| App Store Connect record | Unumae record for `com.unumae.app`, confirmed by the owner on 24 August 2026 |
| Sign in with Apple | Implemented, provider enabled, Client ID confirmed |
| Account deletion in-app | Implemented and deployed |
| Report content | On portraits and questions |
| Block a user | Implemented; blocked people vanish from your view |
| Moderation before publication | Enforced in the database, not by policy |
| Privacy manifest | In `app.config.ts` |
| Permission strings | Photo library string written and translated |
| Age gate | 16, enforced by trigger |
| Privacy policy reachable | Links out to the site from Settings |
| App icon | Approved 1254×1254 opaque RGB artwork configured in `app.config.ts` |
| Launch screen | Approved wordmark on white in both appearance modes for contrast |
| Required website URLs | Live at `https://unumae.app` |
| Universal links | Association published for the reviewed Team ID and bundle |
| Export compliance | Uses only exempt OS/HTTPS encryption; `usesNonExemptEncryption: false` encoded in the iOS build configuration |

## What still needs a person

| Item | Why it cannot be done here |
| --- | --- |
| **Light wordmark**, if a dark splash is wanted | The supplied gradient measures only 1.32:1 against `#0B0B0C`, so the current splash correctly stays white in both appearance modes. |
| **Screenshots** | 6.7" and 6.5" required. They need a real published Human, so they come after the first live cycle. |
| **Description and keywords** | Marketing copy; the site's homepage is the natural source. |
| **App Store listing URL** | Add the badge and smart banner only after App Store Connect provides the real URL and numeric app ID. |
| **Final release build** | Build the exact CI-passed reconciliation/release SHA with `eas build --profile production --platform ios`. Earlier TestFlight build 3 is evidence, not the final artifact. |

If a light wordmark is ever drawn, the dark
variant becomes:

```ts
dark: { image: './assets/splash-dark.png', backgroundColor: '#0B0B0C' },
```

## Developer surfaces

The Settings screen carried a DEVELOPER section — the Supabase project
reference, the connection status, and links into four internal screens — with
no guard. It shipped visible to everybody for eleven phases and was caught by a
screenshot from a real device, not by a test.

Both halves are now closed, because the obvious half is not sufficient:

- the section is behind `__DEV__`, which is false in any release build;
- `src/app/dev/_layout.tsx` redirects the routes themselves, since the app
  registers a URL scheme and universal links and `/dev/tokens` stays reachable
  by deep link whether or not anything points at it.

`tests/dev-surfaces.test.ts` asserts both.

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
