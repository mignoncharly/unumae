# iOS release verification

Phase 5 turns the native and device checks into a repeatable release gate. A
checked box means evidence exists for the exact build being promoted; source
inspection or an Expo Go run does not count as native evidence.

## Automated simulator matrix

On macOS, compile a simulator `.app`, set its path, and run the same guest
core-loop smoke test on all supported iPhone widths:

```bash
export IOS_E2E_APP_PATH=/absolute/path/to/Unumae.app
npm run e2e:ios
```

The local runner installs that build and runs `.maestro/release-smoke.yml` on:

| Class | Device | What the flow proves |
| --- | --- | --- |
| Small | iPhone SE (3rd generation) | Today, Archive, and You remain reachable without clipping |
| Regular | iPhone 16 | Default iPhone navigation and guest access |
| Large | iPhone 16 Pro Max | Content width, safe areas, and tab layout at the large edge |

An equivalent recorded EAS workflow is available through `npm run e2e:ios:eas`.
The current Expo account requires a paid plan for built-in Maestro jobs, so the
local runner is the no-subscription release path. If EAS is enabled later, keep
its workflow URL with the release evidence. Neither path substitutes for the
real-device checks below.

## Real iPhone development-build gate

Build with `eas build --profile development --platform ios`, install it on a
registered iPhone, and record the build ID, device model, and iOS version.
The owner does not currently have an iPhone; a borrowed device or a trusted
TestFlight tester's physical iPhone is valid evidence. Owning the device is not
the requirement—running every check on real iOS hardware is.

- [ ] Sign in with Apple creates or resumes the correct account and returns to Unumae.
- [ ] Email signup and returning sign-in both receive a six-digit code and verify in-app.
- [ ] Switching between two accounts clears the previous account's profile, Remember, questions, and persisted cache.
- [ ] Daily, selected, answered, and anniversary pushes open the intended screen from foreground, background, and terminated states.
- [ ] Notification actions do not duplicate navigation or leave a stale modal.
- [ ] Account deletion removes the auth account, private avatar/portrait media, profile data, and local session/cache.
- [ ] Data export opens the native share sheet and produces readable JSON.
- [ ] The share card captures a real PNG and its text is not clipped.

## Accessibility and resilience gate

- [ ] VoiceOver can traverse Today in a meaningful order; images have useful labels; buttons announce their state.
- [ ] VoiceOver can complete sign-in, onboarding, Ask, Remember, report, Settings, and account deletion.
- [ ] Dynamic Type at the largest Accessibility size does not hide controls or truncate essential text on the small iPhone.
- [ ] Reduce Motion removes decorative transitions while preserving state changes.
- [ ] With the network disabled, a previously loaded Today and Archive remain readable and the offline notice is announced.
- [ ] Restoring the network retries failed states without restarting the app.
- [ ] With the iOS Network Link Conditioner on a very slow profile, skeletons preserve layout and actions cannot submit twice.
- [ ] Crossing 00:00 UTC refreshes Today, Archive, countdown, and eligibility standing exactly once.
- [ ] Resuming after the device slept across 00:00 UTC produces the same result.

## Hosted service gate

Run the read-only Auth configuration check with a scoped Supabase personal
access token in the environment:

```bash
npm run verify:release-config
```

It verifies the production Site URL, native/web redirect allow-list, Apple
provider, both six-digit-code email templates, and custom SMTP. It prints only
pass/fail names, never credentials. Do not use `supabase config push`: the local
Apple block is intentionally disabled because its secret is not stored in this
repository, so a broad push could disable the working hosted provider.

Then run, after every production migration affecting the loop:

```bash
npm run verify:live
npm run verify:safety:live
npm run verify:memory:live
npm run verify:delete-account:live
npm run verify:security
npm run simulate
```

The cycle simulation creates temporary production data and cleans it up. Read
the confirmation prompt and verify the linked project before approving it.

## Evidence record

| Build / migration | Device + iOS | Check | Result | Evidence / issue |
| --- | --- | --- | --- | --- |
| `20260823230000` | Hosted Supabase | 42 migrations + database live suites | Pass | Draw, privileges, signed-in security, safety/privacy, memory/international, and full-cycle simulation pass |
| Current Auth configuration | Hosted Supabase | Production URL/redirects, Apple, code templates, SMTP | Pass | All six checks in `npm run verify:release-config` pass |
| Current `delete-account` deployment | Hosted Supabase | Complete account/media deletion | Pass | Live probe confirms auth account, profile, avatar, portrait photo, and portrait audio are deleted while the draw tombstone is retained |
| Current EAS configuration | EAS Build | Development/production backend environment | Pass | Both required Supabase client variables exist in both environments; build profiles select them explicitly |
| Current App Store record | App Store Connect | App record for `com.unumae.app` | Pass | Existence confirmed by the owner on 24 August 2026 |
| _fill during release_ | | | | |

Failures block beta. Record them in `docs/OPEN_ITEMS.md`; do not convert an
untested box into a pass based on code inspection.
