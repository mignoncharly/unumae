import { router, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useSession } from '@/features/auth/useSession';
import { isProfilelessAccountSegments } from '@/features/profiles/deletion';
import { useMyProfile } from '@/features/profiles/hooks';

/**
 * Signed in, but no profile yet.
 *
 * `verify.tsx` says onboarding is decided by whether a profile exists rather
 * than by that screen — which was right, except nothing was deciding it. After
 * entering the code you landed on Today, looking exactly like a guest, with no
 * indication that a profile was still needed. The only route to onboarding was
 * a button most of the way down Settings.
 *
 * That matters more here than in most products. Without a profile you are not
 * eligible for the draw, so the one thing the app is for silently does not
 * apply to you, and nothing says so.
 *
 * The root layout has always declared this group with `gestureEnabled: false`,
 * which is what a mandatory step looks like. This is the part that was missing.
 *
 * Deliberately not a guard that blocks rendering: reading stays available while
 * the profile query resolves, because a signed-in person is at least as
 * entitled to read as a guest (Article 6.1) and a flash of a wall on a cold
 * start would be worse than a moment of delay.
 */
export function OnboardingGate() {
  const session = useSession();
  const segments = useSegments();
  const { data: profile, isLoading } = useMyProfile();

  const signedIn = session.status === 'authenticated';
  const needsProfile = signedIn && !isLoading && profile === null;

  useEffect(() => {
    if (!needsProfile) {
      return;
    }

    // Already there, or on the way. Navigating again would stack a second copy
    // of the screen behind the first.
    if (isProfilelessAccountSegments(segments)) {
      return;
    }

    router.push('/(onboarding)/profile');
  }, [needsProfile, segments]);

  return null;
}
