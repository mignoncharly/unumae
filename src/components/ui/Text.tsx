import {
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import { useTheme, type ColorToken } from '@/theme';

export type TextVariant =
  | 'display'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'body'
  | 'callout'
  | 'footnote'
  | 'caption'
  | 'mono';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: ColorToken;
}

/**
 * How far each variant may grow under Dynamic Type.
 *
 * Nothing is capped at 1 — that would be refusing to scale, which is the thing
 * this is meant to support. Large display text is capped tighter than body
 * text because it starts big: at 40pt, a 2× multiplier leaves no room for a
 * name, and a name that does not fit is worse than a name that grows less.
 */
const MAX_SCALE: Record<TextVariant, number> = {
  display: 1.6,
  title1: 1.7,
  title2: 1.8,
  title3: 1.9,
  callout: 2.2,
  body: 2.4,
  footnote: 2.4,
  caption: 2.4,
  // The countdown is monospaced and sits on one line; past this it wraps and
  // the digits stop lining up.
  mono: 1.8,
};

/** Headings, so a screen reader can offer "jump to next heading". */
const HEADING_VARIANTS = new Set<TextVariant>([
  'display',
  'title1',
  'title2',
  'title3',
]);

/**
 * Every string on screen goes through here, so Dynamic Type, heading semantics
 * and colour tokens are applied in one place rather than per component
 * (Article 11).
 */
export function Text({
  variant = 'body',
  color = 'text',
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();

  const variantStyle: TextStyle =
    variant === 'mono'
      ? {
          fontFamily: theme.typography.mono.fontFamily,
          fontSize: theme.typography.sizes.body,
          letterSpacing: theme.typography.mono.letterSpacing,
        }
      : {
          fontSize: theme.typography.sizes[variant],
          fontWeight:
            variant === 'display' || variant === 'title1'
              ? theme.typography.weights.bold
              : theme.typography.weights.regular,
          lineHeight:
            theme.typography.sizes[variant] *
            (variant === 'body' || variant === 'callout'
              ? theme.typography.lineHeights.relaxed
              : theme.typography.lineHeights.tight),
        };

  return (
    <RNText
      // Scaling is on — it is only bounded. `allowFontScaling={false}` appears
      // nowhere in this codebase, and a test keeps it that way.
      accessibilityRole={HEADING_VARIANTS.has(variant) ? 'header' : undefined}
      maxFontSizeMultiplier={MAX_SCALE[variant]}
      style={[variantStyle, { color: theme.colors[color] }, style]}
      {...rest}
    />
  );
}
