-- Phase 4 measurement integrity, part 1.
--
-- Enum additions commit separately from the functions that use them. This is
-- intentional: PostgreSQL will not allow a newly-added enum value to be used
-- safely until the transaction that adds it has committed.

alter type public.analytics_event add value if not exists 'active_day';
alter type public.analytics_event add value if not exists 'portrait_started';
alter type public.analytics_event add value if not exists 'portrait_submitted';
alter type public.analytics_event add value if not exists 'question_unvoted';
alter type public.analytics_event add value if not exists 'human_forgotten';
alter type public.analytics_event add value if not exists 'remembered_library_opened';
alter type public.analytics_event add value if not exists 'share_sheet_opened';
