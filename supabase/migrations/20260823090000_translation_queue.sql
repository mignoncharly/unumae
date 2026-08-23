-- Phase 15 — the translation job's queue.
--
-- The write path has existed since Phase 10: `record_translation` puts a
-- translation in its own table, alongside the original and never in place of it
-- (Article 9.6). What was missing is the thing that decides *what* still needs
-- translating, so the job has been a plan rather than a feature.
--
-- Everything here is service role only. There is deliberately no path for a
-- client to supply a translation of somebody else's words — a person's answer
-- in their own language is part of who they are, and a stranger rewriting it is
-- not a feature.

/*
 * What still needs translating.
 *
 * One row per (element, target locale) that has no translation yet, newest
 * cycles first — today's Human matters more than one from four months ago, and
 * a job that starts at the beginning of the Archive would never reach them.
 *
 * Only published, approved portraits. An unapproved portrait may still be
 * rejected, and sending somebody's words to a translation vendor before a
 * moderator has even looked at them would be a leak with a queue in front of
 * it.
 */
create or replace function public.pending_translations(batch_size integer default 50)
returns table (
  portrait_id uuid,
  element_key public.portrait_element_key,
  original_text text,
  target_locale text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.portrait_id,
    e.element_key,
    e.answer,
    locales.code
  from public.portrait_elements e
  join public.portraits p on p.id = e.portrait_id
  join public.daily_draws d on d.id = p.draw_id
  cross join (values ('en'), ('fr'), ('de')) as locales(code)
  where p.status = 'approved'
    and d.selection_status in ('live', 'completed')
    and d.human_number is not null
    and not exists (
      select 1
      from public.portrait_element_translations tr
      where tr.portrait_id = e.portrait_id
        and tr.element_key = e.element_key
        and tr.locale = locales.code
    )
  order by d.selection_date desc, e.portrait_id, e.element_key
  limit greatest(batch_size, 0);
$$;

comment on function public.pending_translations is
  'Untranslated (element, locale) pairs from published portraits. Service role only.';

/*
 * Record that a locale needs no translation, because it is already that
 * language.
 *
 * Without this the job would ask the vendor about the same French answer every
 * night forever, since a French answer never acquires a French translation. It
 * stores the original text as its own translation, which is both true and
 * cheap, and marks the engine so the reason is visible later.
 *
 * The reader adds a translation alongside the original and never replaces it,
 * so a row where the two are identical is harmless: the toggle simply shows the
 * same words, which is the correct answer for somebody reading in the language
 * it was written in.
 */
create or replace function public.record_same_language(
  target_portrait uuid,
  target_element public.portrait_element_key,
  target_locale text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  original text;
begin
  select e.answer into original
  from public.portrait_elements e
  where e.portrait_id = target_portrait
    and e.element_key = target_element;

  if original is null then
    return false;
  end if;

  return public.record_translation(
    target_portrait, target_element, target_locale, original, 'source'
  );
end;
$$;

revoke execute on function public.pending_translations(integer)
  from public, anon, authenticated;
revoke execute on function
  public.record_same_language(uuid, public.portrait_element_key, text)
  from public, anon, authenticated;
