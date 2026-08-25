# Account and device assurance policy

What makes an account eligible for the draw, what the checks establish, and
what they cannot establish.

**Status:** Roadmap v2 Phase 4 · **Adopted:** 2026-08-25

## The claim

Unumae does not verify that an account belongs to a globally unique human.
Without identity documents or a trusted identity provider, that claim would be
false. The controls instead raise the cost of an additional draw entry and
state exactly what passed.

Unumae does **not** collect biometric data. Account and device assurance uses
provider identifiers and opaque platform integrity signals, not face or voice
recognition, liveness checks, identity documents, or biometric templates.

| Level | What it means | What it does not mean |
| --- | --- | --- |
| `contact_verified` | The account's email was confirmed. | The person is unique or owns only one email. |
| `provider_verified` | A stable Apple or Google provider identifier is bound. | Apple or Google proved a civil identity. |
| `device_attested` | The platform verified a genuine app/device and its abuse flag was not already bound to another pool account. | One person owns the device, or will own it forever. |
| `reviewed` | A moderator examined and cleared duplicate-signal flags. | The moderator proved global uniqueness. |

The legacy `verification_level` column remains for compatibility with old
moderation records. It is not an eligibility authority. Clients cannot write
either assurance field.

## Pool entry

At refresh and again at pool freeze, the database independently requires:

```text
account_status = active
wants_selection = true
birth_year <= current UTC year - 16
account age >= 7 days
community rules accepted
stable Apple or Google provider binding exists
platform-attested device is bound to this pool account
minimum participation exists (question, question vote, or Remember)
no unresolved account flag
never previously selected in a non-cancelled cycle
```

Email-only accounts may read and hold a profile but cannot enter the pool. The
birth-year rule is conservative: somebody is admitted only if they were at
least 16 on January 1 UTC of the current year. It may delay an already-16 user,
but does not knowingly admit a 15-year-old from year data alone.

## Provider and email binding

Provider bindings are copied server-side from `auth.identities.provider_id`.
The database uniquely indexes `(provider, provider_id)`; the client never sends
an assurance flag. A Sign in with Apple relay-address change therefore does not
create another provider identity.

Email normalization lowercases the address, removes a plus tag, removes dots
only for Gmail-compatible domains, maps `googlemail.com` to `gmail.com`, and
rejects ambiguous non-ASCII forms. The normalized value is unique. A maintained
disposable-domain denylist is reviewed monthly and can be replaced without a
client release.

## Device attestation

- iOS App Attest objects are verified against the registered Team ID and bundle
  ID with a WebCrypto verifier in the Edge runtime. DeviceCheck bit 0 means the
  device has already been bound at pool entry.
- Android Play Integrity standard verdicts are decoded through Google's REST
  API. Request hash, timestamp, package, app recognition, license, device
  integrity, and configured certificate digests are checked. Device recall bit
  1 is the pool-binding flag.
- A random 256-bit challenge is stored only as SHA-256, expires after five
  minutes, and is atomically consumed before provider verification. Reuse,
  expiry, malformed evidence, and platform/evidence mismatch fail closed.
- The Edge Function writes assurance state with the service role. Raw App
  Attest objects, DeviceCheck tokens, Play Integrity tokens, and IP addresses
  are never stored.
- The vendor flag is set only when the other pool conditions are satisfied, not
  at signup.

The client implementation that requests native platform evidence belongs to
Roadmap Phase 8. Until a supported production build supplies it, accounts fail
closed outside the pool; no production fallback marks a simulator or script as
attested.

## Signals and manual review

Opaque device conflicts, short-window HMACed network clusters, VPN/datacenter
classification when available, and shared push destinations raise an account
flag. A flag pauses pool entry; it never bans an account automatically.

False-positive policy:

1. The user sees that eligibility is pending human review and that the account
   is not banned.
2. A moderator reviews shared-family-device, refurbished-device, transfer, and
   cluster context within seven calendar days.
3. `cleared` or `upheld` is written to the append-only review log with reviewer,
   timestamp, and note. A cleared account is reconsidered at the next refresh.
4. If the queue cannot be staffed within seven days, attestation remains a
   production-traffic blocker; silent exclusion is not acceptable.

## Deletion and retention

Deleting an account removes its normalized email, provider identifier, App
Attest public key, and account-device association. The opaque platform
abuse-prevention flag and the fact that it was bound remain without a user ID.
That exception is disclosed before deletion and prevents delete/reinstall
farming. The complete export and retention decision is recorded in
`docs/PERSONAL_DATA_INVENTORY.md`.

## Deferred phone control

Phone verification is not part of beta. If observed farming makes it
proportionate, it is applied only at draw entry, stores only
`HMAC-SHA256(pepper, E.164)`, rejects virtual/VoIP ranges, and requires updated
privacy and store declarations before launch.
