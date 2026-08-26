# Backup and restore runbook

Before real user data, the scheduled `Encrypted production backup` workflow
must be enabled and one `Restore rehearsal` must pass with elapsed time recorded.
This is interim protection; a paid Supabase plan with managed backups and PITR
remains a hard gate before production traffic.

## Backup policy

- Cadence: daily at 02:17 UTC, plus manual dispatch.
- Scope: complete logical PostgreSQL dump and every object in every private
  Storage bucket. Photos are backed up; there is no accepted photo-loss policy.
- Destination: S3-compatible storage outside Supabase and outside the production
  administrator's normal workstation.
- Encryption: age public-key encryption before upload plus server-side AES-256.
- Retention: 35 days by default; the workflow automatically deletes older
  objects. Configure an immutable/object-lock tier separately where available.
- Alert: a failed or skipped workflow opens or updates a GitHub issue.
- Access: production administrators only, with MFA; the age private key is
  available only to the protected `production-backup` GitHub Environment.

Required environment configuration:

| Kind | Name |
| --- | --- |
| Secret | `PRODUCTION_DATABASE_URL` |
| Secret | `SUPABASE_SERVICE_ROLE_KEY` |
| Secret | `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY` |
| Secret | `BACKUP_AGE_SECRET_KEY` (restore only) |
| Variable | `SUPABASE_URL`, `BACKUP_AGE_RECIPIENT` |
| Variable | `BACKUP_S3_BUCKET`, `BACKUP_S3_REGION`, optional `BACKUP_S3_ENDPOINT` |
| Variable | `BACKUP_RETENTION_DAYS` (default 35) |

## Restore rehearsal

1. Select a complete generation containing `database.dump.age`,
   `storage.tar.gz.age`, and `SHA256SUMS`.
2. Dispatch `Restore rehearsal` with that generation timestamp.
3. The workflow verifies encrypted checksums, decrypts both artifacts, lists the
   storage archive, starts a disposable Supabase stack, restores PostgreSQL with
   ownership removed, and performs a live `profiles` query.
4. Record the workflow URL, generation, commit SHA, elapsed seconds, row/object
   counts, and operator in the release evidence.
5. Investigate any warning or missing object; never call a partial restore a pass.

For an incident restore, create a new isolated project or local stack first.
Never test restoration over the active hosted project. After validation, decide
whether to promote the recovered project, replay post-backup events, or notify
affected users. Rotation of all credentials is mandatory if the loss involved
credential exposure.

## Evidence status

The automation is implemented locally. No claim of a running scheduled backup
or successful timed restore is made until the protected environment is
configured and the workflows have executed successfully.
