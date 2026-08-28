# Phase 11 — release hardening

Status: implementation in progress, 28 August 2026.

This phase closes repository-side release defects that can be handled without
participants, a second Supabase project, Docker, or production traffic. It
does not claim that the iOS release is ready until the manual gates below have
evidence.

## Code and repository work we can complete now

- Keep Expo SDK patch versions aligned with the installed SDK and make
  `expo-doctor` a required CI signal.
- Keep the exact-SHA CI, branch protection, hosted verification, secret scan,
  migration checks, and full test suite green.
- Keep backup content age-encrypted and stored as a GitHub Actions artifact;
  do not add S3 or Docker requirements.
- Keep restore rehearsal fail-closed unless an isolated PostgreSQL target is
  supplied; never restore over the production project.
- Reconcile active release, security, backup, legal, and operations documents;
  remove only superseded prompt files and placeholder directory READMEs.

## Current implementation blockers

| Item | State | What remains |
| --- | --- | --- |
| Expo dependency drift | Code fix in this phase | Merge the PR after the Application check passes. |
| Hosted Auth | Complete | All five release-config checks pass. |
| Phase C hosted verification | Complete | Re-run only when a backend release changes. |
| Encrypted backup | Configuration present | Run it once and retain the artifact/run evidence. |
| Restore rehearsal | Blocked by environment | Requires a separate isolated PostgreSQL target; production is forbidden. |
| Free-plan operations | Not suitable for public launch | Upgrade before public traffic, or document an explicitly limited closed beta. |
| Native iOS gate | Manual | Signed build, physical iPhone, providers, accessibility, resilience, and media/share checks. |
| Phase F release gate | Manual | Legal identity, support route, moderation rota, screenshots, privacy answers, and App Store submission. |

## Manual owner gates

1. Merge the green release-hardening pull request.
2. Produce and record the exact signed iOS build and commit SHA.
3. Complete the physical-device checklist in `IOS_RELEASE_VERIFICATION.md`.
4. Name and test moderation, safety, privacy, deletion, support, alert, and
   rollback owners.
5. Run the encrypted backup workflow and retain its generation/run evidence.
6. Do not mark restore complete without an isolated target and timed rehearsal.
7. Reconcile and publish legal text, App Store privacy answers, metadata,
   screenshots, review notes, and the final support URL.
8. Meet the paid-plan gate before public production traffic.

## Exit criteria

Phase 11 exits when the repository is green on the exact release SHA, the
signed iOS artifact passes native checks, legal/support and moderation owners
are recorded, the backup policy has real evidence, and the remaining restore
and paid-plan decisions are explicitly accepted by the owner. A passing local
test suite alone is not an exit.

## Deliberately out of scope

Android, monetization, AI features, the Human Story Engine, five-year revisits,
optional audio/video, a full PWA, a staging Supabase project, and popularity or
growth mechanics remain deferred by the Product Constitution and current
release plan.
