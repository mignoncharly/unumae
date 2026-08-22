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
 * Every string on screen goes through here, so Dynamic Type and colour
 * tokens are applied in one place rather than per component (Article 11).
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
      style={[variantStyle, { color: theme.colors[color] }, style]}
      {...rest}
    />
  );
}
