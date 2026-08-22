import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Article 11 — reduced motion is not optional.
 *
 * Every animation in the app asks this hook first. A component that animates
 * without consulting it is an accessibility bug.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) {
        setReduced(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
