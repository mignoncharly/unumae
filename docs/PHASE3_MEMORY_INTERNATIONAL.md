# Phase 3 — Memory and international layers

Implemented 2026-08-24.

## Product outcomes

- Remember now opens a private, paginated “Humans I remember” library. It is available from the Archive and works for Today and archived Humans without a public count.
- The Human Archive uses a stable `(selection_date, draw_id)` cursor, has explicit Yesterday and Remembered sections, and signs page photographs in batches.
- Shared archived-Human URLs resolve on the public EN/FR/DE website at `/human/{drawId}` (and localized variants) without an account.
- Today, Archive detail, public Today, and the public Human page consume additive portrait and question/answer translations. The original remains the default and reader-controlled.
- App-language changes synchronize to `profiles.locale`, so the already-localized notification and selection-email worker uses the reader’s current EN/FR/DE preference.
- Onboarding and profile editing use searchable localized country/language pickers instead of raw codes.
- Joining the selection pool is an explicit onboarding choice. The database default for new profiles is now `false`.

## Backend and privacy contracts

- `get_archive_page`, `get_yesterdays_human`, and authenticated-only `get_remembered_humans` expose the new read paths without popularity ordering.
- Portrait and question translations disappear through the public RPC boundary when a Human is redacted or an author is blocked.
- The translation worker can now consume portrait and question queues through explicit `service_role` grants; clients retain no write access.
- Personal export schema version 3 includes derived portrait and question translations.

## Verification

- Fresh local migration rebuild: passed.
- Supabase schema lint: passed with no errors.
- `npm run verify:memory`: passed all Phase 3 database effects and cleaned its synthetic users/data.
- See the final Phase 3 handoff for the complete app, website, test, typecheck, lint, and build results.

## Production rollout

1. Apply `20260823200000_memory_and_international.sql`.
2. Deploy the updated `translate-portraits` Edge Function and retain `DEEPL_API_KEY`.
3. Build/deploy the website and its updated Nginx configuration so dynamic Human UUID paths fall back to the static localized shells.
4. Smoke-test one real shared archived Human in EN, FR, and DE and verify its original/translated control.
5. Verify onboarding, Remember/forget, locale synchronization, and the Archive on a small iPhone, regular iPhone, and Pro Max-size device.
