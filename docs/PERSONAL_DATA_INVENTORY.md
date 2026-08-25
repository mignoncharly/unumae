# Personal-data inventory

**Owner:** Privacy and Security · **Schema:** export v3 · **Reviewed:** 2026-08-25

This register covers every application table and Storage bucket. “Withheld”
means the automated download omits a field because revealing it would expose
another person, a moderator identifier, a credential, or an abuse-detection
mechanism. A legal access request can still be reviewed manually. The download
is deliberately described as a structured account export, not as “everything.”

| Resource | Subject identifier | Data fields | Purpose and visibility | Retention and rationale | Export behavior | Deletion behavior |
| --- | --- | --- | --- | --- | --- | --- |
| `account_device_attestations` | `user_id` | platform, state, timestamps; key hash/public key/counter | Server-only app/device integrity evidence | Account lifetime; anti-farming and replay defense | `account_assurance.device_attestations`; cryptographic key material withheld | Cascade with profile |
| `account_email_addresses` | `user_id` | normalized email, confirmation/update times | Server-only alias prevention | Account lifetime; duplicate-entry prevention | `account_assurance.normalized_email` | Cascade with profile; no email hash retained |
| `account_enforcement_jobs` | `user_id` | target status, attempts, timestamps, error code, idempotency data | Server-only account-control delivery | Until completed operational retention; enforce restrictions reliably | `account_enforcement_history`; idempotency key withheld | Cascade with profile |
| `account_flag_reviews` | Via `flag_id` | decision, note, reviewer, time | Moderator-only review audit | Account lifetime/audit; accountable false-positive review | `account_review_flags[].reviews`; reviewer identifier withheld | Cascade with flag/profile |
| `account_flags` | `user_id` | kind, note, signal kind/hash, review times | Moderator-only abuse review | Account lifetime; prevent duplicate entries | `account_review_flags`; signal hash and detection context withheld | Cascade with profile |
| `account_network_signals` | `user_id` | HMACed network, ASN/class, observed time | Server-only clustering | Account lifetime or shorter operational policy; fraud review | Summary count/latest time only; network hash, ASN and classifier withheld | Cascade with profile |
| `analytics_events` | `user_id` or pseudonymous `install_id` | event, bounded properties, day/time | Internal aggregate product measurement | 90 days; measure beta without behavioral profiles | `analytics_events` for signed-in subject | Cascade for account-linked rows; anonymous rows expire after 90 days |
| `app_settings` | None | operational switches and notes | Internal configuration | Current value; operate safety controls | Not personal; not exported | Not account-linked |
| `archive_removal_requests` | `requester_id` | draw, reason, status, resolution note/times | Requester and moderator workflow | Permanent with draw audit unless legally erased | `archive_removal_requests`; moderator identifier withheld | Cascade with requester before published tombstone rules apply |
| `attestation_challenges` | `user_id` | challenge hash, platform, expiry/consume times | Server-only one-time replay defense | At most one day after consumption/expiry | Count and latest time only; challenge material withheld | Cascade with profile |
| `content_reports` | `reporter_id`; target owner derived from target | reason, note, status, resolution | Reporter/moderator safety workflow | Safety audit retention while needed for enforcement/appeal | `reports_i_made` and sanitized `reports_about_me`; reporter/resolver identifiers withheld | Reporter link cascades; target-side audit follows content deletion policy |
| `daily_draws` | selected/backup profile IDs | selection inputs, status, publication, redaction | Public fairness record plus private candidate references | Permanent; verifiable draw/archive history | Subject’s `selection_history`; other candidate identifiers withheld | Selected identity becomes a redacted tombstone; provider/contact data is not retained |
| `deletion_requests` | `user_id` | stage, attempts, counts, correlation/error data | Server-only retryable deletion workflow | Through completion plus bounded operational audit | `deletion_requests`; idempotency hash/internal lock data withheld | Removed when Auth/profile deletion completes; non-identifying completion logs may remain |
| `device_binding_flags` | `bound_account_id` while account exists; none after deletion | opaque HMAC, platform, bound/seen times | Server-only reinstall-persistent anti-farming flag | Binding fact retained after deletion without a user link; prevent delete/reinstall farming | Boolean/timestamps in `account_assurance`; opaque hash withheld | `bound_account_id` set null; non-identifying flag remains |
| `disposable_email_domains` | None | domain, source, refresh time | Internal denylist | Current reviewed list; abuse prevention | Not personal; not exported | Not account-linked |
| `draw_candidates` | `user_id` | draw membership | Private frozen pool/audit | With draw until account deletion; fairness verification | `selection_history` including subject rank | Cascade with profile |
| `draw_invitations` | `user_id` | position, deadlines, response/open times | Private selection workflow | With account/draw audit | `invitations` | Cascade with profile |
| `draw_precommit_candidates` | `user_id` | precommit date membership | Private committed pool | Until draw/account deletion policy; prove committed membership | `selection_precommits`; no other candidate IDs | Removed by Phase 5 deletion trigger when subject is deleted |
| `draw_precommits` | None directly | pool hash/count, secret seed, algorithm/times | Private until reveal, then public fairness proof | Permanent append-only draw evidence | Referenced from subject `selection_precommits`; secret seed only after public reveal | Not account-linked |
| `founding_moderators` | email | normalized staff bootstrap email, note/time | Server-only moderator bootstrap | Until bootstrap removed; access control | Withheld from automatic user export; staff access request handled manually | Removed administratively when role/bootstrap ends |
| `job_runs` | None by schema; detail must not contain user data | job outcome/detail/time | Internal operations | Operational retention | Not personal by contract; not exported | Not account-linked |
| `job_secrets` | None | encrypted/secret operational values | Service-only credentials | Until rotated | Always withheld | Not account-linked; removed on rotation |
| `moderation_appeals` | `appellant_id` | statement, status, resolution note/times, moderator IDs | Appellant/moderator appeal workflow | Safety audit retention | `appeals`; moderator identifiers withheld | Cascade with appellant |
| `moderation_decisions` | Target owner derived from target | decision, reason, moderator/time | Moderator decision audit | Safety/publication audit | `moderation_decisions_about_me`; moderator identifier withheld | Target cascade where applicable; published audit may be tombstoned |
| `moderation_events` | `subject_id`; `actor_id` for staff | action, target, reason/time | Moderator-only append-style audit | Safety accountability and appeals | Subject rows in `moderation_decisions_about_me`; actor and unrelated target IDs withheld | Subject link set/cascaded according to source; no provider/contact data retained |
| `moderators` | `user_id` | role grant, note/time | Internal access control | While role exists plus access audit | Own role summary only; other moderators withheld | Cascade with profile |
| `notification_deliveries` | `user_id` | category/channel, destination hash, provider/error/status/time | Server-only delivery diagnostics | Bounded operational retention | `notification_deliveries`; destination hash/provider ID withheld | Cascade with profile |
| `notification_log` | `user_id` | category, dedupe key, sent time | Private delivery history/idempotency | Bounded notification audit | `notifications_sent` | Cascade with profile |
| `notification_settings` | `user_id` | preference booleans/update time | Private user preferences | Account lifetime | `notification_settings` | Cascade with profile |
| `operational_alerts` | `resolved_by` may identify moderator | code/message/entity/draw/job/time | Moderator-only operations | Bounded incident audit | Own resolver activity withheld because alerts may expose other users/security | Moderator link set null on deletion |
| `portrait_element_translations` | Via portrait owner | locale/text/engine/time | Public only with publishable portrait; otherwise private/worker | With source portrait | `portrait_translations` | Cascade with portrait |
| `portrait_elements` | Via portrait owner | prompt key, answer/update time | Private draft then public after approval | With portrait/archive policy | Nested in `portraits.responses` | Cascade with portrait |
| `portraits` | `user_id` | draw, status, media paths/times | Private draft/moderation then public archive | Published archive until removal/redaction; drafts account lifetime | `portraits` | Cascade with profile; Storage objects deleted; published draw tombstone retained |
| `profiles` | `id` | name, birth year, country/city, languages, avatar/bio, eligibility/status/assurance/times | Public subset plus private account state | Account lifetime; core service | `profile` | Deleted with account; published draw tombstone is de-identified |
| `provider_bindings` | `user_id` | provider, stable provider ID, bound time | Server-only provider assurance | Account lifetime; duplicate-entry prevention | `account_assurance.provider_bindings` | Cascade with profile; provider ID not retained |
| `push_tokens` | `user_id` | token, platform, seen times | Server-only push delivery | Until sign-out, invalidation, or account deletion | Platform/times in `registered_devices`; raw token withheld | Cascade/sign-out cleanup |
| `question_translations` | Via question author and selected answerer | field, locale/text/engine/time | Public only with approved question/answer | With source question/draw | `question_translations` | Cascade with question |
| `question_votes` | `user_id` | question and time | Private participation; aggregate count public | Account lifetime | `question_votes` | Cascade with profile |
| `questions` | `author_id`; answer belongs to selected Human | body, answer, moderation status/times | Private until approved, then public | With draw/archive and account deletion policy | `questions_authored`; answered content also represented through selection history/translation export | Cascade for author; public record follows archive redaction |
| `remembers` | `user_id` | draw and time | Private personal library | Account lifetime | `humans_i_remember` | Cascade with profile |
| `scheduler_status` | None | installed/detail/check time | Internal operations | Current diagnostic state | Not personal; not exported | Not account-linked |
| `storage_cleanup_jobs` | Object path may contain `user_id` | bucket/path, attempts/errors/times | Server-only deletion retry queue | Until completed or manual review | `storage_cleanup_jobs` for subject-owned paths; locks/internal errors minimized | Removed on successful object deletion; dead-letter retained until resolved |
| `user_blocks` | `blocker_id`; `blocked_id` | relationship and time | Private safety preference | Account lifetime | `blocked_people` reveals display context, not private account ID | Cascade when either profile is deleted |
| Storage `avatars` | First path segment is `user_id` | JPEG avatar object | Public profile image | Account lifetime | Listed in `storage_objects` metadata; binary delivered separately only by manual request | Deleted by retryable account-deletion worker |
| Storage `portraits` | First path segment is `user_id` | JPEG portrait/media object | Private draft, moderator review, then publishable image | With portrait/archive policy | Listed in `storage_objects` metadata; binary delivered separately only by manual request | Deleted by retryable account-deletion worker; archive tombstone remains |

## Automatic export boundary

The beta export is generated synchronously, capped at 5 MiB, written only to the
device cache, shared through the native sheet, and deleted from cache when that
sheet closes. If the structured JSON exceeds the cap, generation fails clearly
instead of exhausting app/database memory. The future asynchronous private-
bucket design is not activated until quota and operational monitoring can
support it.

The retained device flag contains no email, provider identifier, raw device
token, network address, or user ID after deletion. It is an opaque,
non-identifying abuse-prevention fact retained solely to stop deletion and
reinstallation from creating another draw entry.

## Export key registry

These are the schema-v3 top-level keys maintained by the database export. CI
checks that every registered key remains implemented as the table inventory
evolves.

- Export key: `schema_version`
- Export key: `exported_at`
- Export key: `export_scope`
- Export key: `account`
- Export key: `profile`
- Export key: `selection_history`
- Export key: `selection_precommits`
- Export key: `invitations`
- Export key: `portraits`
- Export key: `portrait_translations`
- Export key: `questions_authored`
- Export key: `question_translations`
- Export key: `question_votes`
- Export key: `humans_i_remember`
- Export key: `notification_settings`
- Export key: `registered_devices`
- Export key: `notifications_sent`
- Export key: `notification_deliveries`
- Export key: `analytics_events`
- Export key: `reports_i_made`
- Export key: `reports_about_me`
- Export key: `blocked_people`
- Export key: `moderation_decisions_about_me`
- Export key: `account_review_flags`
- Export key: `account_assurance`
- Export key: `account_enforcement_history`
- Export key: `deletion_requests`
- Export key: `appeals`
- Export key: `archive_removal_requests`
- Export key: `storage_cleanup_jobs`
- Export key: `storage_objects`
- Export key: `moderator_role`
