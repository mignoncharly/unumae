# Phase 6 — abuse resistance and data integrity

Phase 6 removes client-chosen installation identity from every queue-writing path.
Successful platform attestation now issues a random 30-day installation session;
only its SHA-256 hash is stored. The bearer value lives in native secure storage
and is required for app analytics, content reports, and push registration.

Reporting is protected at three layers: 10 reports per account per hour and 30
per day in PostgreSQL, 30 per attested installation per day, and 60 per HMACed
network per hour at the Edge boundary. Targets must exist and be publishable,
self-reports are refused, and only one open report per reporter/target can exist.

Push destinations must match Expo's token shape, belong to the current account,
and map one-to-one to an attested installation. An account may keep at most three
active destinations. Presenting another account's token records review signals
but does not move ownership.

Analytics writes are service-only. The app sends batches of at most 20 events
through `analytics-ingest`; an attested installation and HMACed network each
have independent quotas. Website events contain only event, locale, and source,
with a fresh non-linkable database UUID. Analytics never authorizes or changes
product state.

Daily retention removes delivery attempts after 90 days, notification dedupe
history and dismissed reports after 365 days, expired installation sessions,
two-day rate counters, and consumed or expired attestation challenges.
