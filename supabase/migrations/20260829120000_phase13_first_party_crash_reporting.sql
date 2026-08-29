-- Phase 13: first-party crash reporting.
--
-- Crash diagnostics use the existing attested analytics ingestion boundary.
-- That keeps them subject to the same row-level lock-down and 90-day purge as
-- the rest of the product telemetry, without introducing a third-party SDK.

alter type public.analytics_event add value if not exists 'client_crash';

comment on table public.analytics_events is
  'First-party, attested product and redacted crash telemetry. No IP address, user agent, device model, advertising identifier, or precise location is stored. Rows are purged after 90 days.';
