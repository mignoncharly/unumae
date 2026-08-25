# Rollback and recovery rules

Every roadmap phase adds a concrete rollback note before promotion. "Revert the
commit" is not a production rollback: database state, Auth, storage, cron,
secrets, Edge Functions, and shipped mobile binaries recover differently.

## Universal rules

1. Production migrations are forward-only. Never rewrite an applied migration.
2. Never use `db reset`, `git reset --hard`, destructive seed data, or an
   unreviewed SQL editor command against production.
3. Prefer a compensating migration that restores compatibility.
4. Before a destructive change, create and verify an encrypted off-platform
   logical backup. Storage objects require a separate backup.
5. Keep old and new clients compatible during the rollback window.
6. Record the trigger, decision-maker, commands, result, and data impact.

## Database migrations

Before promotion, record the objects and data touched, compatibility window,
compensating migration, and backup evidence. To recover:

1. Stop only the affected writer or scheduled job if continued execution would
   worsen the incident.
2. Preserve logs and run a sanitized baseline capture.
3. Apply a reviewed forward migration that restores the previous contract or
   disables the faulty behavior.
4. Run role-based and full-cycle verification.
5. Re-enable jobs only after inputs and idempotency are checked.

Free-plan production has no managed restore point. A migration that cannot be
repaired forward is blocked until the Phase 10 logical-backup gate operates.

## RLS, grants, and storage policies

- Restore access with a narrowly scoped compensating migration.
- Never disable RLS globally as an incident shortcut.
- If exposure may have occurred, revoke the suspect grant first, then analyze.
- Compare `npm run baseline:production -- --full` before and after repair.
- Rotate affected credentials if unauthorized access is plausible.

## Cron and orchestration

- Disable only the named job and preserve its schedule/command in evidence.
- Inspect job runs, deliveries, and operational alerts before replaying.
- Confirm idempotency before manual replay.
- Re-enable only after a successful controlled execution.

## Edge Functions

1. Record the failing deployment version and local source hash.
2. Deploy only the affected function from the last known-good commit.
3. Confirm the new control-plane deployment version.
4. Run live verification and observe the next scheduled invocation.

An `OPTIONS` response proves reachability, not source equivalence.

## Hosted Auth

- Do not run `supabase config push`; local Apple Auth is intentionally disabled.
- Capture individual Auth values through the Management API before changing.
- Restore only the changed URL, redirect, provider, template, SMTP, or limit.
- Run `npm run verify:release-config`, then test new/returning email and Apple.

## Secrets

- Never copy a secret into source, tickets, logs, or release evidence.
- If exposure is possible, rotate rather than restoring the old value.
- Record only secret name, rotation timestamp, and verification result.

## Mobile and website

There is no configured over-the-air mobile update system. Internal testers can
reinstall a retained IPA, but App Store users need a corrected build with a
higher number. Keep the backend compatible while Apple reviews it.

For the website, redeploy the last known-good immutable artifact or commit, then
smoke-test TLS, AASA, security headers, routes, and public-data configuration.

## Minimum per-phase rollback entry

```text
Change:
Affected systems:
Previous version / source hash:
Compatibility window:
Rollback trigger:
Containment action:
Compensating migration or artifact:
Data-loss possibility:
Backup evidence:
Verification after rollback:
Decision owner:
```
