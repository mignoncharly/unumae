-- Correction to the previous migration.
--
-- It assumed a policy on storage.objects is evaluated with the table owner's
-- privileges, so the helper function was revoked from every client role. It is
-- not: the policy runs as the *calling* role, which then hit
--
--   permission denied for function is_published_portrait_object
--
-- exactly as it had previously hit permission denied for daily_draws. Same
-- failure, one layer along.
--
-- Granting EXECUTE is the right answer rather than a workaround. The function
-- takes an object name and returns a boolean saying whether that object's
-- cycle has gone live — which is information the caller is about to obtain
-- anyway by fetching the object, and which reveals nothing about anybody when
-- the answer is no.
--
-- What the function still protects, and the reason it is security definer, is
-- the join underneath it: the caller learns the boolean without gaining any
-- read on daily_draws.

grant execute on function public.is_published_portrait_object(text)
  to anon, authenticated;
