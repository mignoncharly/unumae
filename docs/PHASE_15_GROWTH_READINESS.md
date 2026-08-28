# Phase 15 growth-experiment handoff

Status: prepared, not open. Phase 15 may begin only after the Phase G
four-week private beta has matured and `growth_gate()` passes. This document
does not authorize paid acquisition, new growth features, or changes to the
finite product loop.

## Non-negotiable entry gate

Record the result before publishing or purchasing any campaign:

| Check | Required result | Evidence |
| --- | --- | --- |
| D1 retention | At least 25% | `[[TODO: moderator Signals export]]` |
| D7 retention | At least 10% | `[[TODO: moderator Signals export]]` |
| Participation | At least 15% | `[[TODO: moderator Signals export]]` |
| Share rate | At least 3% | `[[TODO: moderator Signals export]]` |
| Cohort maturity | Four complete weeks / 28-day gate window | `[[TODO: cohort dates]]` |
| Product decision | Explicitly open the gate | `[[TODO: dated decision and owner]]` |

Immature cohorts remain `null`, never `0`. If D1 fails, stop all growth work,
fix the product, and begin another mature measurement window. Do not amend a
threshold after inspecting the result.

## Allowed experiment surface

The only growth mechanism is a person voluntarily passing on a Human they found
worth passing on. The initial experiment set is the four editorial surfaces
already described in `docs/GROWTH.md`: TikTok, Instagram, X, and Reddit.

Each experiment must use a real approved Human and a real public URL. It must
not invent a person, quote, audience number, testimonial, or recipient outcome.
The portrait/share-card path remains publication-gated; draft, review, removed,
or private material cannot be used.

No experiment may add or imply:

- referral rewards, invite codes, share-to-unlock, or payment for placement;
- public view counts, popularity, ranking, or audience ownership;
- extra return notifications, streaks, or rewards for daily activity;
- a claim that a recipient received or completed a share.

## Experiment record

Keep the record aggregate-only. Do not put participant names, emails, device
identifiers, raw URLs containing private data, or private analytics exports into
the repository.

| Field | Value |
| --- | --- |
| Gate decision date (UTC) | `[[TODO]]` |
| Gate owner | `[[TODO]]` |
| Experiment / channel | `[[TODO]]` |
| Public Human URL | `[[TODO: approved URL]]` |
| App commit SHA | `[[TODO]]` |
| Backend SHA | `[[TODO]]` |
| Start/end (UTC) | `[[TODO]]` |
| Aggregate reach/input | `[[TODO]]` |
| Aggregate share/open result | `[[TODO]]` |
| Safety or privacy findings | `[[TODO: issue IDs only]]` |
| Stop/continue decision | `[[TODO]]` |

Use `share_started` and `share_sheet_opened` only for what the native APIs can
prove. Neither event proves that a recipient received the Human. Keep campaign
numbers outside the app and reconcile them with the product's privacy policy.

## Stop conditions

Stop the experiment and notify the named owner if any of these occurs:

1. The growth gate is no longer open or a cohort is being interpreted before
   maturity.
2. A campaign requires changing selection probability, moderation, privacy,
   Archive removal, or guest access.
3. A public asset contains an unapproved Human, private detail, invented quote,
   or unverified audience claim.
4. A channel requests engagement mechanics that conflict with the product
   constitution or the rules in `docs/GROWTH.md`.
5. A safety, privacy, deletion, notification, backup, or rollback alert is
   unresolved.

## Repository checks

These checks are local and read-only. They do not query or mutate Supabase, and
they do not start Docker:

```text
npm run verify:growth
npm run verify
npm run scan:secrets
```

`verify:growth` confirms that this handoff, `docs/GROWTH.md`, `docs/BETA.md`,
the fixed thresholds, and the post-launch deferrals still agree. It is not a
growth-gate result and cannot open Phase 15 by itself.
