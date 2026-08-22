import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { isConfigured } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';

export type SessionState =
  /** Still restoring from storage. Never render a gate during this. */
  | { status: 'loading'; session: null }
  /** Article 6.1: a guest is a first-class visitor, not a failed sign-in. */
  | { status: 'guest'; session: null }
  | { status: 'authenticated'; session: Session };

/**
 * The session, restored from storage and kept in sync with Supabase.
 *
 * Guest is a real state with real rights. Nothing here redirects, gates or
 * nags — deciding what requires an account is the caller's job, and the answer
 * is only ever: ask, vote, Remember, enter the draw.
 */
export function useSession(): SessionState {
  // `isConfigured` is a module constant, so an unconfigured build starts as a
  // guest rather than passing through a loading state it can never leave.
  const [state, setState] = useState<SessionState>(() =>
    isConfigured
      ? { status: 'loading', session: null }
      : { status: 'guest', session: null }
  );

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    const supabase = getSupabase();
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }
      setState(
        data.session
          ? { status: 'authenticated', session: data.session }
          : { status: 'guest', session: null }
      );
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState(
          session
            ? { status: 'authenticated', session }
            : { status: 'guest', session: null }
        );
      }
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return state;
}

/** Convenience for the common question: may this person act, or only read? */
export function useIsAuthenticated(): boolean {
  return useSession().status === 'authenticated';
}
