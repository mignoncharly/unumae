# Phase 2 safety and privacy

Phase 2 closes the gap between Unumae's safety promises and their actual user
workflows. The implementation is deliberately content-targeted: people can
report or block from the Human or question they are looking at without the app
revealing another person's private account identifier.

## Reachable workflows

| Promise | User path | Enforced effect |
| --- | --- | --- |
| Report a portrait | Today or Archive Human menu | Moderator sees the photograph, story, reporter reason, and subject state |
| Report a question | Today or Archive question card | Moderator sees the exact question and can dismiss, remove, suspend, or ban |
| Remove published content | Moderator report actions | Approved questions are rejected; live/archived Humans become dated tombstones |
| Block safely | Portrait or question report menu | Server resolves the author; clients receive only an opaque block-management id |
| Manage blocks | Settings > Blocked Users | List and unblock without exposing account UUIDs |
| Appeal a decision | Settings > Appeals | Only a moderator other than the original decision-maker can review it |
| Remove an archived story | Settings > Archive removal | The featured person requests removal independently of account deletion |
| Export personal data | Settings > Privacy | A versioned JSON export opens in the native download/share sheet |
| Delete an account | Settings > Delete account | Avatar and portrait objects are removed before Auth deletion |
| Sign out privately | Settings > Sign out | Push tokens are removed and private memory/disk query caches are cleared |

## Backend guarantees

- Public Today, Archive, Human, question, country, year, anniversary, and random
  readers all apply the same redaction and per-viewer block rules.
- Redaction retains only the Human number and date required for Archive
  continuity; the portrait, responses, questions, and identity stop rendering.
- Report resolution records an explicit action rather than a generic
  "actioned" flag.
- Appeals cannot be reviewed by the moderator who created the appealed event.
- The export includes account/profile, selection history, portraits and
  responses, questions and votes, Remember records, notifications, analytics,
  reports, blocks, moderation decisions, appeals, and removal requests.
- Session ownership has one listener. A changed or uncertain account identity
  clears both the in-memory cache and persisted private cache before rendering.

## Verification

`npm run verify:safety` creates synthetic local users and executes the real
RPCs for blocking, report inspection/removal, portrait redaction, full portrait
review, Archive removal, independent appeals, push cleanup, and export. It
deletes its synthetic users and cycles afterward and never prints credentials.

Before release, deploy both Phase 2 migrations and the updated
`delete-account` Edge Function, run the safety verifier against an isolated
staging project, and confirm the JSON share sheet and account media deletion on
a development iPhone build.
