# Operations

Phase 16 — running this at ten thousand people.

Everything here is an instrument. **None of it is wired to anything.** That
distinction is the whole design, and it is worth stating before the details,
because at scale the tempting move is to let the numbers steer the product.

| Tempting | Why not |
| --- | --- |
| Balance the draw by country | Article 5.2 — the draw takes eligibility and chance. A third input and "why was this person selected?" stops having a checkable answer. |
| Weight against suspicious accounts | Same. And a false positive silently removes someone from a lottery they think they are in. |
| Notify the people who have gone quiet | Four notification categories exist and there is no code path for a fifth (Phase 10). |
| Penalise people who decline | Article 5.5 — declining costs nothing. `is_eligible` cannot see a response at all. |

`tests/scale-schema.test.ts` fails the build if the draw ever learns any of it.

---

## The nightly schedule

| UTC | Job | What it does |
| --- | --- | --- |
| 23:50 | `refresh_selection_eligibility` | Recomputes who is in the pool |
| 00:00 | `run_daily_draw(D+2)` | Freezes the pool and draws, two days ahead |
| 00:01 | `publish_due_cycles` | Today's approved portrait goes live |
| 00:10 | `notify_selected_candidate` | Writes the invitation |
| 00:15 | `send-notifications` | Edge Function, via pg_net |
| 01:00 | `translate-portraits` | Edge Function, via pg_net |
| 03:30 | `purge_old_analytics` | Ninety-day retention, enforced |
| every 15 min | `expire_stale_invitations` | Expires, escalates, notifies the backup |

pg_cron runs SQL; Edge Functions speak HTTP. `invoke_function` bridges the two
with pg_net.

### Credentials

`invoke_function` needs the project's functions URL and a service role key.
Neither can live in a migration, because migrations are committed. They live in
`public.job_secrets` — RLS on, no policy, no grants to any client role — and are
written by:

```bash
npm run db:settings
```

That reads `docs/supa_keys.md` and prints neither value. Re-run it after
rotating the key.

This started as database settings, which is the pattern Supabase's own
documentation uses. It does not work here: the project's `postgres` role is not
a superuser, so `alter database … set` on a custom parameter is refused. The
table is better anyway — a GUC is invisible, nothing audits it, and its value
leaks into any error that quotes the statement that set it.

### Did they run?

**Operations** tab in the moderation console, or:

```sql
select * from public.job_history(20);
```

Every invocation records a row in `public.job_runs`, including the failures —
`pg_net is not installed`, `job_secrets is missing …`. A job that fails by
raising is a job whose failure nobody sees until they open a log they have never
opened. A row is visible from the console.

This is not paranoia. `run_daily_draw` was broken from Phase 4 to Phase 14 and
nothing noticed, because a scheduled job nobody can see the result of is
indistinguishable from one that is not running.

---

## The instruments

### Queue health

Ages, not sizes. A portrait waiting is a cycle waiting, and unlike everything
else that can go wrong here, **nobody is told** — the selected person sees
"submitted" and waits. The console shows a warning past twelve hours.

`cycles_at_risk` counts upcoming cycles with no approved portrait yet. That is
the number that predicts a Quiet Day.

### Country balance

Share of the pool against share of the Archive, per country, and the drift
between them.

A country at 8% of the pool and 1% of the Archive is worth a look. It is most
likely luck — with a few hundred cycles this number is mostly noise, and reading
it as a problem early is reading tea leaves. But it could also be invitations
not arriving, a moderation bias, or an acceptance window that lands at 3am for a
whole country. All three are worth a human noticing.

Countries with fewer than five people waiting are named in this moderator view
but never in the public one (`country_representation`), where being the only
person waiting somewhere would identify you the day you are drawn.

### Integrity signals

The fraud that matters here is one person holding many accounts to improve
their odds. It is the only cheating this product has a motive for, because there
is nothing else to win.

The usual answer is device fingerprinting, and **this schema cannot do it**.
`analytics_events` has no IP address, no device model, no advertising
identifier, and `tests/analytics-schema.test.ts` asserts those columns do not
exist. That was decided in Phase 11 and this is the bill arriving, on time and
worth paying.

So the signals are weak and honest:

| Signal | Means |
| --- | --- |
| `signup_bursts` | Accounts created within a minute of another. Ordinary signup does not cluster; a script does. |
| `abandoned_cycles` | Accepted and never submitted. Each one cost a cycle and had to be rescued by escalation. |
| `email_only_pool` | How much of the pool is verified by an email address alone. |
| `country_year_collisions` | Same country and birth year. Arithmetic at ten thousand people — only meaningful alongside a burst. |

They catch the careless and not the determined. **The real defence against a
determined multi-accounter is raising `verification_level`**, which has a real
cost to real users and should be a deliberate decision rather than something
drifted into. `require_liveness_before_publication` in `app_settings` is the
switch, and it is off.

---

## The backup candidate system

Verified end to end by `npm run simulate`, which exercises both ways out of a
cycle:

- **Declining** escalates immediately — the candidate has answered, so there is
  nothing to wait for.
- **Silence** escalates when the fifteen-minute sweep finds the expired
  deadline.

Both promote `backup_1`, shift the queue up, and — the part that matters —
write a *new invitation*, because `escalate_draw` moves the queue and only
`notify_selected_candidate` creates the thing `accept_selection` looks for. A
promotion without an invitation would be a cycle that quietly cannot be
accepted by anybody.

If everyone contacted passes, the draw is cancelled and re-run rather than
edited, so the record of what happened survives.

Declining costs nothing, and that is structural: `is_eligible` never reads
`draw_invitations`.

---

## Running the simulation

```bash
npm run simulate            # two cycles, escalation, instruments, then cleans up
npm run simulate -- --keep  # leave the data in place to look at in the app
npm run simulate -- --clean # remove what a previous run left behind
```

⚠️ It runs against the live project and uses the service role to delete rows
from `daily_draws`. That is deliberate — a simulation against a different
database only proves the simulation works — but it means the script must never
point anywhere else, and its cleanup is worth re-reading before changing.

Run it after any migration touching the draw, moderation, publication or
escalation. Three fatal bugs have been found this way, all of them invisible to
the offline suite, because the schema guards read SQL as text and cannot tell
you it runs.
