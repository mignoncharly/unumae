# Phase C — hosted verification of Phases 1–6

Status: **Complete; hosted evidence captured on 28 August 2026.**

Phase C uses the one hosted Supabase project and the protected `production`
GitHub Environment. It does not create a staging project, require a signed
iPhone, or claim App Attest/DeviceCheck provider success. Those native-provider
checks remain in Phase D.

## Execution

1. Confirm the intended `main` SHA has a successful `CI` workflow and has been
   deployed through `Deploy hosted environment`.
2. Dispatch `Phase C hosted verification` with that full SHA.
3. Review the migration/function parity result and the sanitized pre/post
   baselines in the workflow summary.
4. Retain the workflow run URL, exact SHA, probe results, and cleanup result in
   the release record. Never copy secret values or synthetic user data into
   the record.

The workflow runs these bounded, self-cleaning probes in sequence:

- anonymous privilege and signed-in security boundaries;
- draw integrity;
- account restriction, moderation, appeal, token cleanup, and privacy export;
- memory/international and translation/export effects;
- every Edge Function’s CORS, authentication, malformed-input, service-role,
  attestation-replay, deletion, and idempotency contracts;
- hosted Auth/Storage account deletion with nested media;
- the complete daily-cycle simulation, including escalation and cleanup.

Every probe owns its synthetic fixtures and continues to the next probe after a
failure so later cleanup blocks still run. The workflow captures a post-run
baseline even when a probe fails. A baseline difference is a review failure,
not an assertion that the difference is harmless.

## Evidence record

| Field | Value |
| --- | --- |
| Workflow run | [Phase C hosted verification run 33154080116](https://github.com/mignoncharly/unumae/actions/runs/33154080116) |
| Tested `main` SHA | `24f630ef477ad73275c2eeb9ea5b53a0cdc75eb2` |
| Hosted Supabase project | `qpicjsjxdblrxdrdibge` |
| Pre-verification baseline | Captured by the protected workflow; sanitized |
| Post-verification baseline | Captured by the protected workflow; sanitized |
| Migration/function parity | Passed |
| Phase 1–6 probes | All bounded hosted probes passed |
| Synthetic cleanup | Passed; probe-owned fixtures were removed |
| Baseline diff | None after excluding `captured_at_utc` |
| Operator / UTC timestamp | Automated GitHub Actions run / 28 August 2026 UTC |

## Phase C exit decision

Phase C is complete only when the exact SHA is CI-proven and deployed, all
bounded probes pass, migration and Edge Function parity is confirmed, the
sanitized baseline is unchanged apart from capture time, and no synthetic
accounts, media, tokens, reports, analytics events, or test-only records remain
outside documented audit/tombstone semantics.
