# Phase 7 — worker and notification reliability

Phase 7 gives every scheduled Edge invocation a five-minute database lease.
Retries reuse the same `job_runs` row, use quadratic backoff, and stop after
three attempts in `dead_letter`. Expired leases are recovered automatically and
raise a durable `worker_stale_lease` alert before redispatch.

Translation work runs with concurrency five. Provider transport failures are
reduced to bounded categories; original portrait and question text never enters
failure records or logs. Each target/locale pair retries at most five times,
after which it remains visible in `translation_failures` and leaves the derived
translation queue.

Successful Expo push tickets enter `expo_push_receipts`. A separate leased
worker checks receipts after fifteen minutes. `DeviceNotRegistered` and sender
mismatch disable the destination; transient failures retry five times and then
enter visible dead letter. Provider response text is not retained.

Android creates `general` and high-importance `selection` channels before
requesting notification permission or registering a token. Server messages
name the corresponding channel.

Operational alerts now cover repeated worker failures, expired leases, queue
growth, worker and receipt dead letters, provider authentication, notification
delivery collapse, and configured database/storage/egress quota use at 80%.
Storage and egress observations are supplied through
`record_resource_quota_status`; database use is measured directly.

## Local verification

```bash
supabase db reset
npm run test:db:phase7
npm run test:edge
npm run verify:edge
npm run verify:integration
npm run verify:safety
```

Provider delivery, receipt timing, Android channel presentation, and hosted
quota observations still require staging credentials and physical devices.
