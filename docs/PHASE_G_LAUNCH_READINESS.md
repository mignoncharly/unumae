# Phase G launch-readiness handoff

Status: repository preparation complete on 28 August 2026. This document does
not claim that the alpha, private beta, or public launch has happened. Those
results require real participants, an approved signed iOS build, staffed
operations, and the hosted environment.

## Gates that must be true before recruitment

- Phase D physical-device evidence is complete for the exact release candidate.
- Phase E backup, restore, alert, and incident ownership evidence is complete.
- Phase F legal, moderation, support, metadata, and App Review evidence is
  complete.
- `npm run simulate` passes against the approved hosted target and cleans up all
  synthetic accounts, media, draws, and numbers it creates.
- The cohort start date, build number, backend SHA, moderator rota, support
  route, and rollback owner are recorded before inviting anyone.

## Internal alpha record: 10–20 people

The alpha answers whether the loop is understandable and worth repeating. It is
not a marketing campaign and it must not be used to justify paid acquisition.
Use `docs/BETA.md` for the protocol and observe the product in person without
putting names, emails, screenshots containing private data, or free-form
testimonials into the repository.

| Field | Value |
| --- | --- |
| Alpha window (UTC) | `[[TODO: start — end]]` |
| Participant count | `[[TODO: aggregate count 10–20]]` |
| iOS build number / EAS ID | `[[TODO]]` |
| App commit SHA | `[[TODO]]` |
| Hosted backend SHA | `[[TODO]]` |
| Moderator/on-call owner | `[[TODO]]` |
| Support route tested | `[[TODO]]` |
| Blocking findings | `[[TODO: issue IDs only]]` |
| Alpha decision | `[[TODO: fix and repeat / proceed to beta]]` |

Record observations as aggregate counts and issue IDs. The four questions to
answer are: whether Today's Human is interesting, whether people want to ask a
question, whether anyone opens the Archive, and whether anyone shares a
portrait without being asked.

## Private beta record: four complete weeks

The private beta target is 100 active people. The draw is real during this
stage. Start the 28-day measurement window only after the cohort and build are
stable; immature cohorts must remain `null`, never be treated as a failed zero.

| Field | Value |
| --- | --- |
| Beta window (UTC) | `[[TODO: start — end]]` |
| Cohort size | `[[TODO: aggregate count]]` |
| iOS build number / EAS ID | `[[TODO]]` |
| App commit SHA | `[[TODO]]` |
| Hosted backend SHA | `[[TODO]]` |
| Moderator/on-call coverage | `[[TODO]]` |
| Deletion and export checks | `[[TODO: evidence link]]` |
| Notification and alert checks | `[[TODO: evidence link]]` |
| Accessibility and crash review | `[[TODO: evidence link]]` |
| Growth-gate decision | `[[TODO: hold / fix and repeat / open]]` |

The precommitted gate is unchanged:

| Check | Threshold | Source |
| --- | ---: | --- |
| D1 retention | 25% | `src/constants/retention.ts` and `growth_gate()` |
| D7 retention | 10% | `src/constants/retention.ts` and `growth_gate()` |
| Participation | 15% | `src/constants/retention.ts` and `growth_gate()` |
| Share rate | 3% | `src/constants/retention.ts` and `growth_gate()` |

Read the gate through the moderator Signals surface or the moderator-only RPCs
documented in `docs/BETA.md`. Do not change a threshold after seeing the cohort
result. If D1 fails, do not buy users; fix the product and begin another mature
window.

## Launch-day and first-cycle record

Promote only the exact app artifact and backend SHA that passed the prior phase
checks. Record timestamps in UTC and keep evidence free of personal data.

| Event | UTC timestamp | Operator | Evidence |
| --- | --- | --- | --- |
| App release made available | `[[TODO]]` | `[[TODO]]` | `[[TODO]]` |
| Backend promotion complete | `[[TODO]]` | `[[TODO]]` | `[[TODO]]` |
| Health, quota, backup and alert check | `[[TODO]]` | `[[TODO]]` | `[[TODO]]` |
| Draw committed and executed | `[[TODO]]` | `[[TODO]]` | `[[TODO]]` |
| Consent and moderation completed | `[[TODO]]` | `[[TODO]]` | `[[TODO]]` |
| Human published or Quiet Day recorded | `[[TODO]]` | `[[TODO]]` | `[[TODO]]` |
| Questions/report/block paths observed | `[[TODO]]` | `[[TODO]]` | `[[TODO]]` |
| UTC rollover and Archive transition | `[[TODO]]` | `[[TODO]]` | `[[TODO]]` |
| Notification/email delivery checked | `[[TODO]]` | `[[TODO]]` | `[[TODO]]` |
| Rollback decision / owner | `[[TODO]]` | `[[TODO]]` | `[[TODO]]` |

A Quiet Day is a valid outcome. Never fabricate a Human, backdate a cycle for
marketing evidence, or publish an unreviewed portrait.

## Repository checks

These are read-only/local checks and do not start Docker or mutate hosted state:

```text
npm run verify:phase-g
npm run verify
npm run web:check
npm run scan:secrets
```

`verify:phase-g` checks that the documented order, 28-day window, precommitted
thresholds, aggregate-only evidence rule, and launch/rollback requirements still
match the code and release documents. It is a repository gate, not a substitute
for the real alpha, beta, or first production cycle.
