# Incident runbooks

Declare an incident, name an owner, preserve timestamps and correlation IDs,
and link evidence without copying personal data or secrets. Contain first;
database changes are forward-only and production SQL is CI-promoted.

## Draw failure

Freeze new draw/escalation dispatch, preserve `daily_draws`, pool commitments,
and job history, then run the independent draw verifier. Repair with a reviewed
forward migration. Publish a Quiet Day rather than editing an auditable result.

## Notification failure

Keep invitations and dedupe rows. Inspect worker leases, Expo receipts, Resend,
and `notification_deliveries`; rotate a failed provider credential in its
environment and retry only due rows. Never create a second invitation to make a
notification appear successful.

## Data deletion failure

Keep the account `deletion_pending`. Stop only the failing worker if continued
execution worsens loss, preserve the request stage, fix the provider/data fault,
and requeue from `resume_stage`. Verify Storage, profile graph, then Auth.

## Credential exposure

Revoke and rotate the exposed credential immediately in staging or production,
Vault, GitHub/EAS, providers, and backup storage as applicable. Review audit
logs from the earliest possible exposure. Record only secret names and rotation
times, never values. Rebuild mobile binaries if a non-public value entered one.

## Moderator compromise

Remove the moderator through the audited revocation path, revoke Auth sessions,
rotate their access, preserve moderation events, and independently review every
action since the suspected compromise. Two-person approval is required before
restoring access.

## Quota exhaustion

Stop nonessential analytics/translation work, preserve draw/publication and
deletion, inspect database disk, Storage, egress, and MAU usage, then remove only
data covered by documented retention jobs. Never delete audit history or user
content ad hoc. Upgrade capacity before resuming growth traffic.

## Unplanned project pause

Confirm status through the Management API and Supabase dashboard, resume the
project, check migration and function versions, verify scheduled jobs and Vault
configuration, then run hosted health and the daily-cycle smoke suite. Staging
resume delay is acceptable; production traffic requires the paid-plan gate.

## Data loss

Make the damaged project read-only where possible. Select the newest complete
off-platform database/storage generation, rehearse it into an isolated target,
measure the recovery point and elapsed time, reconcile post-backup events, and
switch traffic only after Auth, Storage, deletion, draw, and publication checks.
Notify affected people if content cannot be reconstructed.

After every incident, document detection gap, recovery time, data-loss window,
follow-up owner, and a dated drill or automated regression.
