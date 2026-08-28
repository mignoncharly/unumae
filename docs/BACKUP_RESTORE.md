# Backup and restore runbook

Before real user data, the scheduled `Encrypted production backup` workflow
must be enabled and one `Restore rehearsal` must pass with elapsed time recorded.
This is interim protection; a paid Supabase plan with managed backups and PITR
remains a hard gate before production traffic.

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
  limit. A paid Supabase plan with managed backups and PITR remains required
  before public production.
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

For an incident restore, create a new isolated project first. Never test
restoration over the active hosted project. After validation, decide whether to
promote the recovered project, replay post-backup events, or notify affected
users. Rotation of all credentials is mandatory if the loss involved credential
exposure.

## Evidence status

The automation is implemented locally. No claim of a running scheduled backup
or successful timed restore is made until the protected environment is
configured and the workflows have executed successfully.
