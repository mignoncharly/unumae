# Phase 5 — privacy inventory and export alignment

Implemented locally on 25 August 2026.

## Outcome

- `docs/PERSONAL_DATA_INVENTORY.md` records an export, deletion, visibility,
  retention, and purpose decision for every public application table and both
  Storage buckets.
- Personal export schema v3 now includes provider/account assurance, sanitized
  device-attestation metadata, review flags and decisions, reports involving
  the subject, committed draw membership and rank, enforcement/deletion jobs,
  and subject-owned Storage records.
- Other users’ identifiers, moderator identifiers, provider credentials,
  cryptographic evidence, destination hashes, and abuse-detection internals are
  explicitly withheld and named in the export itself.
- The synchronous beta export fails clearly above 5 MiB. Its temporary device
  file is still deleted after the native share sheet closes. The asynchronous
  private-bucket design remains the documented scale path rather than silently
  consuming the current Storage quota.
- Frozen precommit membership now cascades on account deletion. The committed
  hash remains immutable, so a deletion between commit and draw makes the draw
  fail closed rather than retaining a personal identifier.
- The in-app explanation, website policy, iOS privacy manifest, and App Store
  label instructions now agree on coarse location, birth year, provider/device
  identifiers, moderation/assurance data, withholding, and the retained
  non-identifying device flag.

## Verification

- `npm run test:db:phase5` creates a subject across Phase 4/5 internal tables,
  verifies exported and withheld fields, and proves deletion removes provider
  and precommit identifiers while retaining only the de-identified device flag.
- `tests/phase5-privacy-inventory.test.ts` compares every application table and
  Storage bucket with the maintained inventory and verifies the export-key
  registry and size boundary.

## Hosted rollout

After local and CI verification, deploy through the protected single-project
workflow. Exercise a synthetic authenticated export with moderation and
assurance history, verify the generated file on a physical iPhone, clean up the
fixture, and reconcile App Store Connect with `docs/APP_STORE.md`.
