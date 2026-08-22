import { render as rtlRender } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import { initI18n } from '@/i18n';

/**
 * Fixed insets: real ones are measured asynchronously on device, which makes
 * tests flaky for no benefit.
 */
const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/**
 * Renders with the providers every screen assumes. Tests always run in English
 * so that assertions read as the canonical strings (Article 9.6).
 *
 * `render` is asynchronous in @testing-library/react-native v14 — every call
 * site must await it, or the queries resolve against an unmounted tree.
 */
export function render(ui: ReactElement) {
  initI18n('en');

  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <SafeAreaProvider initialMetrics={METRICS}>{children}</SafeAreaProvider>
    ),
  });
}

export * from '@testing-library/react-native';
