# Phase F release-readiness handoff

Status: repository preparation complete on 28 August 2026. Phase F is not
closed until the owner completes the external gates below. No Docker, local
Supabase container, or hosted mutation is required for the repository checks.

## Repository evidence

The following files are the reviewed release pack:

| Concern | Source of truth | Verification |
| --- | --- | --- |
| EN/FR/DE App Store fields and character limits | `docs/app-store-metadata.json` | `npm run verify:app-store` |
| App Review note | `docs/APP_REVIEW_NOTES.md` | `npm run verify:app-store` |
| Privacy manifest and iPhone-only scope | `app.config.ts` | `npm run verify:app-store` |
| Production EAS and ASC wiring | `eas.json` | `npm run verify:app-store` |
| Public legal and community routes | `website/src/content/site.ts`, `website/src/content/legal.ts`, `website/src/content/trust.ts` | `npm run web:check` |
| Apple universal-link association | `website/public/.well-known/apple-app-site-association` | `npm run verify:app-store` |
| Personal-data inventory | `docs/PERSONAL_DATA_INVENTORY.md` | Owner reconciliation against the submitted build |

The metadata fields are within the documented limits: subtitle 30, promotional
text 170, description 4000, keywords 100, and first-release notes 4000
characters. The verifier recalculates the values from the JSON rather than
trusting a manually copied count.

## Human-owned completion record

Do not mark a row complete until the named person, channel, target, and evidence
location are recorded. The names and contact details are intentionally absent
from source control until the owner approves them.

| Queue or promise | Named owner | Response target | Escalation route | Evidence |
| --- | --- | --- | --- | --- |
| Portrait moderation before publication | `[[TODO: named moderator/on-call]]` | `[[TODO: target]]` | `[[TODO: backup moderator]]` | `[[TODO: staffing rota]]` |
| Question moderation | `[[TODO: named moderator/on-call]]` | `[[TODO: target]]` | `[[TODO: backup moderator]]` | `[[TODO: staffing rota]]` |
| Reports and blocks | `[[TODO: named safety owner]]` | `[[TODO: target]]` | `[[TODO: urgent-harm route]]` | `[[TODO: runbook/rota]]` |
| Moderation appeals | `[[TODO: different moderator]]` | `[[TODO: target]]` | `[[TODO: escalation route]]` | `[[TODO: appeal rota]]` |
| Privacy requests and exports | `[[TODO: privacy contact]]` | `[[TODO: target]]` | `[[TODO: legal escalation]]` | `[[TODO: published contact]]` |
| Archive removal | `[[TODO: named owner]]` | `[[TODO: target]]` | `[[TODO: escalation route]]` | `[[TODO: support procedure]]` |
| Deletion failures | `[[TODO: operations owner]]` | `[[TODO: target]]` | `[[TODO: incident route]]` | `[[TODO: alert drill]]` |
| Hosted health and delivery alerts | `[[TODO: on-call owner]]` | `[[TODO: acknowledgement target]]` | `[[TODO: incident commander]]` | `[[TODO: alert test]]` |

The same approved identity and support contact must appear consistently in the
published Privacy Policy, Terms, Community Guidelines, support URL, and App
Store Connect contact fields. Do not replace these placeholders with a personal
address unless that address is the approved staffed support channel.

## External gates, in order

1. Approve and publish controller identity, support channel, response targets,
   Terms, Privacy Policy, Community Guidelines, deletion information, and the
   privacy/data-processing reconciliation.
2. Assign and test the moderation, appeals, privacy, Archive-removal,
   deletion-failure, and alert on-call coverage above.
3. Run the signed release candidate on a physical iPhone and complete
   `docs/IOS_RELEASE_VERIFICATION.md`; record the exact build number and git
   SHA.
4. Run at least one genuine published cycle. Use it for honest review-state
   validation and screenshots; do not create a fictional Human or testimonial.
5. Capture the required iPhone screenshots from that exact representative build.
6. Fill App Store Connect from `docs/app-store-metadata.json` and
   `docs/APP_REVIEW_NOTES.md`, add the approved support contact, and verify all
   privacy answers against `docs/PERSONAL_DATA_INVENTORY.md`.
7. Submit only the signed artifact whose SHA and build number are recorded in
   the Phase D evidence and whose source passes the release checks.

## Local handoff checks

Run these from the repository root. They do not start Docker or mutate hosted
state:

```text
npm run verify
npm run web:check
npm run scan:secrets
```

The completed Phase F repository gate prints the external actions that remain;
that output is not evidence that those owner-only actions have been completed.
