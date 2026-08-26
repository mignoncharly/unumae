# Moderators — how the role works, in detail

Everything you need to know about who can moderate, how the first one comes to
exist, and how to add or remove one later.

---

## 1. Why this needed solving at all

`public.moderators` is **service-role only**. No client can insert into it —
not a user, not even a moderator. That is deliberate: if moderators could
appoint moderators, the role would spread without anyone deciding to spread it.

But it creates a chicken-and-egg problem. Until one row exists in that table:

- `moderation_portrait_queue()` returns nothing
- `review_portrait()` refuses with `insufficient_privilege`
- no portrait can be approved
- `publish_due_cycles()` publishes nothing, because it only publishes cycles
  whose portrait a person approved
- **every cycle becomes a Quiet Day, forever**

So the first moderator is not a nice-to-have. Nothing goes live without one.

## 2. Bootstrap through controlled tooling

Phase 10 empties the legacy `public.founding_moderators` bootstrap table so a
personal address does not remain as dormant access-control data. Create the
account, complete onboarding, then have a production administrator call the
audited service-role grant in the protected environment. Never seed a personal
email in an immutable migration.

### What you will actually see

1. Open the app, sign in with the intended staff address.
2. Complete onboarding (username, name, year of birth, country).
3. Settings now shows a **Moderation** row that was not there before.
4. Open it: five tabs — Portraits, Questions, Reports, Appeals, and Archive
   removal requests.

If the row does not appear, §6 tells you how to check why.

## 3. What a moderator can do

| Action | Function | Effect |
| --- | --- | --- |
| Approve a portrait | `review_portrait(id, 'approved')` | Portrait → `approved`, cycle → `ready`. It goes live at 00:01 UTC on its date. |
| Reject a portrait | `review_portrait(id, 'rejected')` | Portrait → `rejected`, cycle → `replacement_required`, so escalation can find somebody else. |
| Approve a question | `review_question(id, 'approved')` | It becomes visible and votable. |
| Reject a question | `review_question(id, 'rejected')` | It never appears. The asker is not told. |
| Dismiss a report | `resolve_report(id, 'dismiss', note)` | Closes it without changing content or account state. |
| Remove reported content | `resolve_report(id, 'remove_content', note)` | Rejects a question or redacts a portrait, including published Archive content. |
| Suspend from a report | `resolve_report(id, 'suspend_account', note)` | Suspends the content author and removes selection eligibility. |
| Ban from a report | `resolve_report(id, 'ban_account', note)` | Bans the content author and removes selection eligibility. |
| Suspend or ban | `set_account_status(id, 'suspended'\|'banned')` | Also removes them from the candidate pool immediately. |
| Decide an appeal | `review_moderation_appeal(id, overturned, note)` | Requires a moderator other than the original decision-maker. |
| Decide Archive removal | `review_archive_removal(id, approved, note)` | An approval redacts the published portrait and leaves its numbered tombstone. |

**Every one of these writes a `moderation_events` row** recording who acted, on
what, and why. That table is append-only: nothing updates or deletes it, and no
client role has any write on it.

A moderator **cannot**: appoint another moderator, edit the log, read the
candidate pool, see who upvoted what, or read anybody's private library.

## 4. Adding a moderator later

Two service-role functions, taking an **email** rather than a uuid, because
nobody knows their own uuid.

From the Supabase dashboard → SQL editor:

```sql
select public.grant_moderator('someone@example.com');
```

Returns `true` on success and `false` if that email has no profile yet. In that
case the person must finish onboarding before the operator retries; do not add a
future address to the legacy bootstrap table.

## 5. Removing one

```sql
select public.revoke_moderator('someone@example.com');
```

The legacy bootstrap table remains empty. Revocation changes the active role;
there is no separate seed row to clean up.

## 6. Checking, and fixing it by hand

Who is a moderator right now:

```sql
select u.email, m.added_at, m.note
from public.moderators m
join auth.users u on u.id = m.user_id
order by m.added_at;
```

Is a specific person one:

```sql
select exists (
  select 1 from public.moderators m
  join auth.users u on u.id = m.user_id
  where u.email = 'you@example.com'
);
```

The fully manual path, if the automatic promotion did not fire — usually
because onboarding was not completed, so no `profiles` row exists:

```sql
-- 1. Confirm there is a profile. If this returns nothing, finish onboarding.
select p.id, u.email
from public.profiles p
join auth.users u on u.id = p.id
where u.email = 'you@example.com';

-- 2. Insert directly.
insert into public.moderators (user_id, note)
select p.id, 'Appointed by hand'
from public.profiles p
join auth.users u on u.id = p.id
where u.email = 'you@example.com'
on conflict (user_id) do nothing;
```

## 7. Approving the very first portrait

Once you are a moderator, the sequence that produces a live Human is:

1. `refresh_selection_eligibility()` runs at **23:50 UTC** and marks eligible
   profiles — needs an account at least 7 days old, email confirmed, community
   rules accepted, and `wants_selection` on.
2. `run_daily_draw()` at **00:00 UTC** freezes the pool and draws for **D+2**.
3. `notify_selected_candidate()` at **00:10 UTC** creates the invitation.
4. The candidate accepts within **12 hours** and writes their portrait.
5. **You approve it** in Settings → Moderation → Portraits.
6. `publish_due_cycles()` at **00:01 UTC** on the day publishes it.

Step 1 is the one that will surprise you first: with no eligible profiles the
draw records a cancelled cycle and the app shows a Quiet Day. That is correct
behaviour, not a bug — see `docs/VERIFICATION_POLICY.md` for the bar.

To exercise the whole chain sooner without waiting days, run the steps by hand
from the SQL editor:

```sql
select public.refresh_selection_eligibility();
select public.run_daily_draw((now() at time zone 'utc')::date);
select public.notify_selected_candidate((now() at time zone 'utc')::date);
```

The candidate then accepts in the app, writes a portrait, you approve it, and:

```sql
select public.publish_due_cycles();
```
