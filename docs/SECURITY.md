# Security

The product publishes one ordinary person to the entire world every day. The
security model is not about protecting a company asset — it is about protecting
the person on screen.

## Threat model

| Threat | Consequence | Mitigation |
| --- | --- | --- |
| Draw manipulation | The core promise is a lie | Pool hash + seed recorded before the draw; service-role writes only; audit rows never deleted (Article 5.2) |
| Bot-inflated candidate pool | Fake humans get published | Progressive proof of humanity, strictest at selection (Article 8.5) |
| Harassment of Today's Human | Real harm to a real person | No DM at any tier (Article 8.3); moderated questions; block and report |
| Unmoderated content going live | Harm at global scale | Layer 3 human review before publication (Article 8.1) |
| Doxxing via profile data | Real-world danger | Country only; city and exact age optional and hideable (Article 8.2) |
| Privilege escalation via RLS gap | Any of the above | Default deny; catalog-wide and role-based tests run on a fresh database in CI |
| Credential leakage | Account takeover | Secrets never in the repo; tracked files are scanned in CI without printing secret values |
| Queue flooding | Reports, push destinations, or analytics exhaust service capacity | Valid targets, attested installation sessions, strict payload bounds, ownership rules, layered quotas, and scheduled retention |
| Silent worker loss | A crashed or looping worker leaves critical work unfinished | Five-minute leases, bounded attempts, dead-letter states, safe provider categories, receipt processing, and durable operational alerts |

## RLS is the security model

The Supabase anon key ships inside the app and is **public by design**. It is
safe only because Row Level Security is enabled on every table with default-deny
policies. Consequently:

- Every `create table` enables RLS in the same migration. Enforced by
  `scripts/verify-migrations.mjs` and `tests/schema-guard.test.ts`.
- The service-role key **never** reaches the client. It exists only in Edge
  Functions and scheduled jobs.
- Analytics and report ingestion cross bounded Edge Functions. Their HMACed
  network keys and attested session hashes are never exposed through client RPCs.
- Supabase's own guidance is to review RLS policies before production; Phase 13
  makes that a test suite, not a checklist.
- `PUBLIC` receives no implicit function execution. Every client-callable RPC
  is in an explicit allowlist and all new functions inherit a revoked default.
- CI executes the policies as anonymous, signed-in, cross-user, restricted,
  moderator, and service contexts instead of trusting migration text alone.

## Secrets

| Secret | Where it lives | Where it must never be |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | `.env`, EAS env | — (public) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env`, EAS env | — (public, RLS-protected) |
| `EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER` | `.env`, EAS env | Public project identifier |
| Service-role key | Supabase Edge env, encrypted Vault scheduler entry, protected GitHub Environment | Developer `.env`, app bundle, repo, or log |
| Apple signing keys | EAS credentials | The repo |

`.gitignore` excludes `.env*` except `.env.example`. Any `EXPO_PUBLIC_` prefixed
variable is embedded in the client bundle — treat that prefix as a declaration
that the value is public.

GitHub workflows use read-only repository permissions and immutable action
commit SHAs. Database CI uses only the throwaway keys produced by its local
Supabase stack. Release-candidate and hosted-promotion workflows refuse to act
unless GitHub records a successful `CI` workflow for the exact requested SHA.

The public website's production CSP permits scripts, styles, fonts, and static
assets only from the reviewed origins and does not use `unsafe-inline`.
Person-specific HTML and social cards are generated only from anonymous RPCs
that already enforce publication and redaction state; candidate and draft data
are never build inputs.

## Authentication (Phase 3)

- Sign in with Apple first; email magic link second. No classic passwords.
- Sessions persist in AsyncStorage with refresh-token rotation enabled.
- **Guest viewing is never gated** (Article 6.1). Auth failures must degrade to
  the guest experience, never to a wall.

## Progressive proof of humanity (Article 8.5)

| Stage | Requirement |
| --- | --- |
| Viewing | none |
| Signup | Apple or email |
| Ask, vote, Remember | account + rate limiting |
| Selection eligibility | account age, activity, device signals, optional phone |
| On being selected | explicit acceptance, guided portrait, and human review before publication |

Friction is applied where the risk is. Low friction to discover, high assurance
only where it matters.

## Data protection

- **Deletion**: account deletion first locks the account, then a retryable
  worker recursively removes private storage, profile data, and Auth in that
  order. An archived
  Human may request removal, which leaves a tombstone — number and date remain,
  content does not (Article 8.6).
- **Export**: users download a versioned JSON package through the native share
  sheet. It includes their content, participation, notification, analytics,
  report, block, moderation, appeal, and removal-request history.
- **Retention**: `daily_draws` audit rows are retained permanently. They contain
  no published content and are what makes fairness verifiable.
- **Location**: country only. Precise location is never collected, so it can
  never leak.

## Client-side rules

- Never render server error text directly. `AppError` carries an i18n key, not a
  message from a backend.
- Never log tokens, emails or user identifiers.
- Keep the Supabase session in the Keychain, not AsyncStorage. The access and
  refresh tokens are the account; `src/lib/supabase/secureStorage.ts` chunks
  them across keystore items and migrates anyone already signed in.
- Never expose another account's UUID for blocking; resolve the account from a
  visible portrait or question and return only an opaque management id.
- Clear in-memory and persisted private query caches whenever account identity
  changes or cannot be reconciled safely.
- Validate with the same Zod schemas on the client and in Edge Functions. Client
  validation is a convenience; the server check is the real one.

## Crash reporting

A crash report is a diagnostic that has been handed whatever the failing code
was holding, which is why it is treated as user data rather than as a log.

- **No third party is wired up.** `src/lib/errors/reporter.ts` ships a no-op
  provider by default, the same shape as the analytics provider. Analytics are
  first-party by policy, the iOS privacy manifest declares no data shared with
  a broker, and the App Store privacy answers were written against that. Adding
  a crash SDK is a privacy-label change and a manifest change, not a dependency
  change — treat it as one.
- **Nothing reaches a provider unredacted.** `redact()` removes whole classes of
  value rather than trying to detect secrets: JWTs and bearer tokens, API keys,
  email addresses, every uuid, credentials inside connection strings, and the
  query string of a signed storage URL. Losing a row id from a stack trace costs
  a little debugging convenience; keeping one costs a person their privacy.
- **A redacted message is still not user-facing.** It goes to the reporter only.
  The rule above — render an `AppError` i18n key, never backend text — is why
  `AppErrorBoundary` replaces Expo Router's default boundary, which renders
  `error.message` on screen in production.
- **A reporter must never become the crash.** Every failure inside `reportCrash`
  is swallowed, and the global handler chains the previous one rather than
  replacing it.

## Reporting a vulnerability

Until a security contact exists, open a private security advisory on the GitHub
repository. Do not open a public issue for anything affecting user safety.
