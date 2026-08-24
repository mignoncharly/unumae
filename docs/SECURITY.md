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
| Privilege escalation via RLS gap | Any of the above | Default deny; every table has policies; tested in Phase 13 |
| Credential leakage | Account takeover | Secrets never in the repo; anon key is public by design |

## RLS is the security model

The Supabase anon key ships inside the app and is **public by design**. It is
safe only because Row Level Security is enabled on every table with default-deny
policies. Consequently:

- Every `create table` enables RLS in the same migration. Enforced by
  `scripts/verify-migrations.mjs` and `tests/schema-guard.test.ts`.
- The service-role key **never** reaches the client. It exists only in Edge
  Functions and scheduled jobs.
- Supabase's own guidance is to review RLS policies before production; Phase 13
  makes that a test suite, not a checklist.

## Secrets

| Secret | Where it lives | Where it must never be |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | `.env`, EAS env | — (public) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env`, EAS env | — (public, RLS-protected) |
| Service-role key | Supabase dashboard, Edge Function env | The app bundle, the repo, any log |
| Apple signing keys | EAS credentials | The repo |

`.gitignore` excludes `.env*` except `.env.example`. Any `EXPO_PUBLIC_` prefixed
variable is embedded in the client bundle — treat that prefix as a declaration
that the value is public.

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
| On being selected | liveness / selfie verification before publication |

Friction is applied where the risk is. Low friction to discover, high assurance
only where it matters.

## Data protection

- **Deletion**: account deletion removes profile data and media. An archived
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
- Never expose another account's UUID for blocking; resolve the account from a
  visible portrait or question and return only an opaque management id.
- Clear in-memory and persisted private query caches whenever account identity
  changes or cannot be reconciled safely.
- Validate with the same Zod schemas on the client and in Edge Functions. Client
  validation is a convenience; the server check is the real one.

## Reporting a vulnerability

Until a security contact exists, open a private security advisory on the GitHub
repository. Do not open a public issue for anything affecting user safety.
