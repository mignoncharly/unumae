# Phase 16 scale and deferred-feature handoff

Status: design-only and closed. The current release must not ship the AI
Interview Assistant, Human Story Engine, or “Where Are They Now?”. Existing
scale instrumentation may continue to operate, but a feature implementation
requires an explicit post-launch decision after Phase 15 has opened and real
evidence supports the change.

## Entry criteria

- Phase G launch is complete, including the first observed production cycle.
- Phase 15 growth experiments have passed their documented safety and
  measurement gates.
- The product owner records which feature, if any, is approved for discovery.
- A privacy, safety, accessibility, moderation, and operational review is
  completed before implementation.
- The approved design still fits the two core loops and every non-negotiable
  rule in `docs/PRODUCT_CONSTITUTION.md`.

## Feature guardrails

### AI Interview Assistant

If discovery is approved, the assistant must remain an interviewer, never a
personality or ghostwriter:

- model output is a question, not portrait prose;
- suggestions live in a separate draft surface and never overwrite typed text;
- promoting a suggestion is an explicit act by the selected person;
- original words remain separate from translations and model output;
- model-provider disclosure, retention, deletion, processor review, and an
  accessible non-AI path are settled before any user test.

### Human Story Engine

Research may study which prompts help people express themselves, but it must
not optimize individual Humans for reach or reintroduce popularity signals:

- no view score, Remember count, ranking, audience metric, or per-person
  engagement target;
- research data has a documented consent, minimization, retention, and export
  contract;
- editorial review remains accountable for prompts and publication;
- experiments must not turn a research signal into selection probability.

### Where Are They Now?

This feature requires time rather than a shortcut:

- revisit only an archived Human after five years;
- obtain fresh consent before publishing new material;
- preserve the original Archive record and its removal/tombstone behavior;
- do not infer a person's current location, identity, or life changes;
- no placeholder, synthetic person, or fabricated update may appear while the
  five-year interval has not elapsed.

## Decision record

Complete this only after the entry criteria pass. Keep evidence aggregate-only
and do not put model prompts, private participant content, or personal data in
the repository.

| Field | Value |
| --- | --- |
| Decision date (UTC) | `[[TODO]]` |
| Owner | `[[TODO]]` |
| Approved track | `[[TODO: none / interviewer / story research / revisit]]` |
| Phase 15 gate evidence | `[[TODO]]` |
| User-safety review | `[[TODO]]` |
| Privacy/processor review | `[[TODO]]` |
| Accessibility review | `[[TODO]]` |
| Moderation/operations review | `[[TODO]]` |
| Rollback and removal plan | `[[TODO]]` |

## Explicitly still deferred

Monetization, Android release work, and a full web/PWA remain Phase 17/post-iOS
work. They must not enter the iOS launch critical path or be enabled as a side
effect of Phase 16 discovery.

## Repository checks

These checks are local and read-only. They do not query or mutate Supabase and
do not start Docker:

```text
npm run verify:phase-16
npm run verify
npm run scan:secrets
```

`verify:phase-16` checks that the deferred-feature guardrails, constitution
constraints, and post-launch boundaries remain present. It does not authorize
implementation.
