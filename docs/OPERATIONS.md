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
| 00:00 | `run_daily_draw_job(D+2)` | Freezes the pool, draws two days ahead, records the outcome |
| 00:01 | `publish_due_cycles_job` | Publishes or records why today's cycle did not publish |
| 00:10 | `notify_selected_candidate_job` | Writes the invitation and records the outcome |
| 01:00 | `translate-portraits` | Edge Function, via pg_net |
| 03:30 | `purge_old_analytics` | Ninety-day retention, enforced |
| 03:45 | `purge_phase6_operational_data` | Delivery, dismissed-report, session, challenge, and rate-counter retention |
| every 5 min | `expire_invitations_job` | Expires, escalates, and immediately notifies the backup |
| every 5 min | `invoke_notifications_if_due` | Retries due push/email delivery without creating empty job rows |
| every 5 min | `refresh_operational_alerts` | Detects failed/stalled jobs, aging review, and at-risk cycles |
| every 5 min | `retry_worker_runs` | Recovers expired Edge leases and redispatches bounded retries |
| every 15 min | `process-push-receipts` | Checks Expo delivery receipts and disables permanently invalid destinations |
| every minute | `enforce-account-status` | Applies versioned suspend/ban/restore outbox jobs to Auth session revocation |
| every minute | `process-account-deletions` | Resumes lock-first deletion through storage, database, and Auth cleanup |
| every 15 min | `reconcile-storage` | Deletes queued replacements and unreferenced objects older than one hour |

pg_cron runs SQL; Edge Functions speak HTTP. `invoke_function` bridges the two
with pg_net.

### Credentials

`invoke_function` needs the project's functions URL and a service role key.
Neither value can live in a migration. Both are encrypted in Supabase Vault and
are written through a service-role-only configuration RPC by:

```bash
npm run db:settings
```

That reads the owner-managed gitignored credential file and prints neither
value. Re-run it for the single hosted project after rotating either key.

The notification Edge Function also needs two function secrets for the
selection-email fallback:

```bash
npx supabase secrets set RESEND_API_KEY=... NOTIFICATION_FROM_EMAIL=selection@unumae.app
```

`NOTIFICATION_FROM_EMAIL` must belong to a domain verified by the configured
Resend account. These are Edge Function secrets, not Expo client variables and
must never be placed in `.env` under an `EXPO_PUBLIC_` name.

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

Every invocation records a `queued`, `succeeded`, or `failed` row in
`public.job_runs`, including configuration failures such as `pg_net is not
installed` or missing job secrets. Queuing an HTTP request is not success: the
notification and translation Edge Functions complete their own job row after
the provider/database work finishes. The Operations console also keeps active
alerts for failed or stalled work until it recovers or a moderator resolves it.

Notification attempts are recorded separately in
`public.notification_deliveries`. Only a provider-accepted push or email writes
the logical dedupe row in `notification_log`; failed attempts remain retryable.
Destinations are stored only as SHA-256 hashes. Selection falls back to the
verified account email when no registered device accepts its push.

Account restrictions use `account_enforcement_jobs`, not an unaudited direct
provider call. The current status version supersedes older queued work, a worker
claim has a five-minute lease, and failures retry with bounded error codes. The
worker revokes refresh sessions rather than permanently banning Auth login,
because suspended and banned people must still be able to authenticate for
appeal, export, and deletion. PostgreSQL remains the immediate enforcement
boundary before and after that re-authentication.

Account deletion uses `deletion_requests`. `retryable_failure` resumes at the
recorded stage; `manual_review` means ten attempts were exhausted. Operators use
only the support correlation ID, correct the provider or data fault, and requeue
that stage without reactivating the profile. Storage reconciliation is also
leased and retryable. Alert on manual-review rows, sustained cleanup-queue
growth, or quota growth that does not match registered portrait/profile paths.
The complete runbook is `docs/PHASE2_ACCOUNT_DELETION.md`.

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

Platform attestation now issues a short-lived opaque installation session. It
can enforce queue quotas without storing a raw network address or a client-
chosen device identifier. The remaining behavioral signals are weak and honest:

| Signal | Means |
| --- | --- |
| `signup_bursts` | Accounts created within a minute of another. Ordinary signup does not cluster; a script does. |
| `abandoned_cycles` | Accepted and never submitted. Each one cost a cycle and had to be rescued by escalation. |
| `email_only_pool` | How much of the pool is verified by an email address alone. |
| `country_year_collisions` | Same country and birth year. Arithmetic at ten thousand people — only meaningful alongside a burst. |

They catch the careless and not the determined. **Any stronger identity check
is a product, privacy, and accessibility decision**, not an operations toggle.
The beta publication bar is explicit acceptance, a completed guided portrait,
and human moderation. The dormant liveness switch was removed in Phase 5 so an
operator cannot enable a biometric requirement without a complete user flow and
policy amendment.

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
npm run simulate            # local full cycle, races, empty pool; self-cleans
npm run simulate:live       # explicit hosted equivalent; self-cleans
npm run simulate -- --keep  # leave the data in place to look at in the app
npm run simulate -- --clean # remove what a previous run left behind
npm run verify:safety:live  # safety/privacy effects; synthetic rows self-clean
npm run verify:memory:live  # Archive/i18n effects; synthetic rows self-clean
npm run verify:delete-account:live # auth, tombstone, avatar and portrait media
```

`npm run simulate` defaults to the disposable local stack. `simulate:live` is
the intentionally explicit hosted variant; it uses the hosted service role and
deletes its marked synthetic draw rows during cleanup. Never substitute the
hosted command into CI.

Run it after any migration touching the draw, moderation, publication or
escalation. Three fatal bugs have been found this way, all of them invisible to
the offline suite, because the schema guards read SQL as text and cannot tell
you it runs.

## Phase 3 CI operations

GitHub CI has three required jobs: application, website, and a fresh Supabase
backend. The backend starts Docker services, reapplies every migration from an
empty database, lints the live schema, checks generated types, runs pgTAP and
Edge provider tests, probes real HTTP/RLS boundaries, simulates the full cycle,
and tears the stack down even after failure.

Useful local equivalents:

```bash
supabase start
supabase db reset --yes
supabase db lint --local --level warning
npm run verify:db-types
supabase test db
npm run test:edge
npm run verify:integration
npm run simulate
supabase functions serve --no-verify-jwt --env-file supabase/functions/ci.env # separate terminal
npm run verify:edge
supabase stop --no-backup
```

`--no-verify-jwt` disables only the local gateway check. Every function's own
authorization boundary remains enabled and is what the black-box suite tests.
Production deployment does not use this flag.

---

## Email sign-in

The app asks for a six-digit code: `signInWithOtp` to send, `verifyOtp` with
`type: email` to check it. The code is correct and always was.

What was wrong is the hosted project, in two places, and the first real sign-in
found both:

1. **The email templates were the stock ones**, which use `{{ .ConfirmationURL }}`.
   So the email carried a link rather than a code. A link cannot complete a code
   flow — it hands the session to a browser, which then has to get it back to
   the app.
2. **Site URL was still `http://localhost:3000`**, the Supabase default. So the
   link landed there, with a valid session sitting in the URL fragment and no
   application to receive it.

The account was created and confirmed regardless — the link did work, in the
sense that it verified the address. It just did it somewhere nothing was
listening, leaving a confirmed user with no profile.

### Templates cannot be edited without custom SMTP

The dashboard shows the subject and body as read-only, above a banner:

> Set up custom SMTP to edit templates. Emails will be sent using the default
> templates.

So the stock link-based emails cannot be replaced until an SMTP provider is
configured. That is needed for launch regardless: the built-in sender is rate
limited to a handful of messages an hour and is documented as development-only,
which is not a service anybody can sign up through.

Until then, `npm run dev:code -- you@example.com` mints the same one-time code the
email would have carried and prints it, so the flow can be tested end to end.
The app is unchanged: it verifies that code exactly as it would verify one that
arrived by email.


### Setting up SMTP (Resend)

About twenty minutes, and the DNS records are the only fiddly part.

1. **resend.com** → add the domain `unumae.app`.
2. Add the DNS records it gives you — an MX and a TXT for SPF, a TXT for DKIM.
   Without them mail is unsigned and lands in spam, which for a sign-in code
   means people simply cannot get in.
3. Create an API key.
4. Supabase → **Authentication → Emails → SMTP Settings**:

| Field | Value |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | the Resend API key |
| Sender email | something on the verified domain, e.g. `hello@unumae.app` |
| Sender name | Unumae |

5. **Authentication → Rate Limits** — the email limit defaults to about 30 an
   hour even with custom SMTP. That is a sign-up ceiling, so raise it before a
   launch rather than discovering it during one.

Volume is low here: notifications go over Expo push rather than email, sessions
persist, and Apple sign-in sends nothing at all. Email is essentially new
accounts and returning sign-ins, so a free tier goes a long way.

### Which templates matter

Supabase ships six. **Two apply**, because this product has no passwords —
Sign in with Apple and a six-digit email code, and nothing else.

| Template | Applies |
| --- | --- |
| Magic link or OTP | **Yes** — a returning address |
| Confirm sign up | **Yes** — an address seen for the first time |
| Reset password | No. There is no password to reset |
| Invite user | No. Signing up is open; nobody is invited |
| Change email address | No UI for it yet. Wire the template when there is one |
| Reauthentication | Not used |

Configuring the other four would be dressing up doors that open onto nothing.

### The fix, in the dashboard

**Authentication → URL Configuration**

| Field | Value |
| --- | --- |
| Site URL | `https://unumae.app` |
| Additional Redirect URLs | `onehuman://`, `https://unumae.app/**` |

**Authentication → Email Templates**, once SMTP is configured — paste the
contents of
`supabase/templates/` into both **Confirm signup** and **Magic Link**. Both,
not one: Supabase picks between them by whether the address is already known,
so fixing only one makes sign-in work for new users and not returning ones, or
the reverse.

The templates live in the repository so they are reviewable and cannot drift
unnoticed. They must keep `{{ .Token }}` and must not regain a link.

### Why this is not done with `supabase config push`

The CLI can push `config.toml` to the linked project, and it would set these
correctly. It would also push `[auth.external.apple] enabled = false`, which is
in that file on purpose — enabling Apple locally would require a client ID and
secret in the repository — and **disable Sign in with Apple on the live
project**. There is no dry run, so the first sign that had happened would be an
iOS build whose sign-in button stopped working.

Two settings by hand are cheaper than that.
