-- Roadmap v2 Phase 3 -- make the executable RPC surface explicit.
--
-- PostgreSQL grants EXECUTE on newly created functions to PUBLIC by default.
-- Earlier migrations granted the intended anon/authenticated/service roles but
-- several wrapper functions still retained that implicit PUBLIC grant. Their
-- internal authentication guards prevented data access, but the API surface
-- was broader than the documented contract. Remove the implicit path globally
-- and prevent it from recurring for functions created by future migrations.

revoke execute on all functions in schema public from public;
alter default privileges in schema public
  revoke execute on functions from public;

-- Storage evaluates object INSERT policies before its metadata row contains a
-- stable size value. Enforce the upload boundary at the bucket (the provider's
-- authoritative pre-insert control), then re-check the stored MIME/size during
-- atomic portrait registration. Keeping size/MIME in the RLS predicate made
-- every otherwise valid SDK upload fail closed with HTTP 400.
update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg']::text[]
where id in ('avatars', 'portraits');

create or replace function public.can_insert_owned_storage_object(
  target_bucket text,
  object_name text,
  object_metadata jsonb
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_account_status() = 'active'
    and target_bucket in ('avatars', 'portraits')
    and split_part(object_name, '/', 1) = (select auth.uid())::text
    and object_name ~ case target_bucket
      when 'portraits' then
        ('^' || (select auth.uid())::text
          || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
          || '/photo/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$')
      else
        ('^' || (select auth.uid())::text
          || '/avatar/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$')
      end
    and (
      select count(*) from storage.objects o
      where o.bucket_id = target_bucket
        and split_part(o.name, '/', 1) = (select auth.uid())::text
    ) < 10;
$$;

revoke execute on function public.can_insert_owned_storage_object(text, text, jsonb)
  from public, anon;
grant execute on function public.can_insert_owned_storage_object(text, text, jsonb)
  to authenticated;
