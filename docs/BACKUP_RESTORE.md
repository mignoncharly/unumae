# Backup and restore runbook

Before real user data, the scheduled `Encrypted production backup` workflow
must be enabled and one `Restore rehearsal` must pass with elapsed time
recorded.

**Plan decision, 28 August 2026.** Unumae stays on the Supabase Free plan for
launch. Managed backups and point-in-time recovery are therefore not available,
and this self-managed workflow is the whole of the backup story rather than a
supplement to a managed one. That is a deliberate, accepted trade, and it holds
only because the workflow below is genuinely independent of the plan: it uses
`pg_dump`, `age` and GitHub artifact storage, none of which Supabase gates.

What staying on Free actually costs, and what covers it:

| Free-plan limit | Mitigation |
| --- | --- |
| No managed backups or PITR | This workflow, daily, encrypted, verified by rehearsal. Recovery point is up to 24 hours, not minutes — accept it or raise the cadence. |
| Project pauses after inactivity | `hosted-health.yml` keeps the project warm every six hours and alerts on failure. |
| One day of log retention | Accepted. Incident investigation must start from `operational_alerts` and `job_runs`, which are in the database and therefore in the backup. |
| Quota ceilings | `resource_quota_status` is sampled and alerted on. |

Nothing in the schema, the Edge Functions or the app depends on a paid plan, so
upgrading later is a billing change and not a migration.

## Backup policy

- Cadence: daily at 02:17 UTC, plus manual dispatch.
- Scope: complete logical PostgreSQL dump and every object in every private
  Storage bucket. Photos are backed up; there is no accepted photo-loss policy.
- Destination: GitHub Actions artifact storage, outside Supabase and outside the
  production administrator's normal workstation. The artifact is linked to the
  backup run and retained for 35 days.
- Encryption: age public-key encryption before upload, plus GitHub's encrypted
  artifact storage. This is an interim closed-beta control, not object lock or
  point-in-time recovery.
- Retention: 35 days, subject to the repository/organization artifact-retention
  limit. Raising retention beyond 35 days, or adding object lock, needs a
  destination outside GitHub artifact storage.
- Alert: a failed or skipped workflow opens or updates a GitHub issue.
- Access: production administrators only, with MFA; the age private key is
  available only to the protected `production-backup` GitHub Environment.

Required environment configuration:

| Kind | Name |
| --- | --- |
| Secret | `PRODUCTION_DATABASE_URL` |
| Secret | `SUPABASE_SERVICE_ROLE_KEY` |
| Secret | `BACKUP_AGE_SECRET_KEY` (restore only) |
| Secret | `RESTORE_DATABASE_URL` (isolated restore target only) |
| Variable | `SUPABASE_URL`, `BACKUP_AGE_RECIPIENT` |

## Restore rehearsal

1. Select a complete generation containing `database.dump.age`,
   `storage.tar.gz.age`, and `SHA256SUMS`.
2. From the completed backup workflow, copy the generation timestamp and run
   ID, then dispatch `Restore rehearsal` with both values.
3. The workflow verifies encrypted checksums, decrypts both artifacts, verifies
   every extracted storage object against its manifest, restores PostgreSQL
   into the isolated hosted target with ownership removed, and checks the
   critical schema, functions, relationships, and approved private-media
   references. It does not use Docker or a local Supabase stack.
4. Record the workflow URL, generation, commit SHA, elapsed seconds, row/object
   counts, and operator in the release evidence.
5. Investigate any warning or missing object; never call a partial restore a pass.

### Where the isolated restore target comes from on the Free plan

The rehearsal restores into an isolated **hosted** project rather than a local
stack, on purpose: that is what a real recovery is, so the rehearsal has to be
the same shape. A runner-local database would prove only that the dump loads.

A Supabase organization on the Free plan may hold two active projects, and the
production project is one of them. So the second slot is the restore target:

1. Create a second Free project, `unumae-restore-drill`, in the same region.
2. Take its **session-mode pooler** connection string (IPv4; the direct host is
   IPv6-only and GitHub runners cannot reach it — this is the same trap
   `fix-hosted-baseline-ipv4` hit).
3. Set it as the `RESTORE_DATABASE_URL` secret in the `production-backup`
   GitHub Environment.
4. Run `Restore rehearsal` with a generation timestamp and backup run ID.
5. **Delete the drill project when the rehearsal passes.** Leaving it running
   consumes the second Free slot and leaves a full copy of production data in a
   project nobody is watching. Recreate it for the next rehearsal; creating a
   project is a two-minute job and deleting it is the whole point.

The drill project needs no migrations, functions or secrets of its own — the
dump carries the schema, and `pg_restore` runs with `--clean --if-exists`.

For an incident restore, create a new isolated project first. Never test
restoration over the active hosted project. After validation, decide whether to
promote the recovered project, replay post-backup events, or notify affected
users. Rotation of all credentials is mandatory if the loss involved credential
exposure.

## Evidence status

The automation is implemented locally. No claim of a running scheduled backup
or successful timed restore is made until the protected environment is
configured and the workflows have executed successfully.
