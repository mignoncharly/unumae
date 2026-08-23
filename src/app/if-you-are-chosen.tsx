import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import {
  ACCEPTANCE_WINDOW_HOURS,
  PORTRAIT_ELEMENTS_MAX,
  PORTRAIT_ELEMENTS_MIN,
} from '@/constants/constitution';
import { useTheme } from '@/theme';

/**
 * What being chosen actually involves, before it happens.
 *
 * Almost nobody will have thought about it. Being told at 09:00 that the world
 * is waiting for you, with twelve hours to decide, is a bad moment to learn
 * what is being asked — and it has a cost beyond the fright: `abandoned_cycles`
 * in the Operations tab counts the people who accepted and then did not follow
 * through, and each one of those burns a day nobody gets back.
 *
 * Every number on this page comes from src/constants/constitution.ts, which is
 * asserted against the constitution itself, so the page cannot drift from what
 * the product does.
 */
function Step({ title, body }: { title: string; body: string }) {
  const theme = useTheme();

  return (
    <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.sm }}>
      <Text variant="title3">{title}</Text>
      <Text color="textSecondary">{body}</Text>
    </View>
  );
}

export default function IfYouAreChosenScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  const nevers = ['never1', 'never2', 'never3', 'never4'];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('chosen.title') }} />
      <Screen>
        <Text variant="title1">{t('chosen.heading')}</Text>
        <Text
          color="textSecondary"
          style={{ marginTop: theme.spacing.md }}
          variant="callout"
        >
          {t('chosen.intro')}
        </Text>

        <Step
          body={t('chosen.acceptBody', { hours: ACCEPTANCE_WINDOW_HOURS })}
          title={t('chosen.acceptTitle')}
        />
        <Step
          body={t('chosen.writeBody', {
            min: PORTRAIT_ELEMENTS_MIN,
            max: PORTRAIT_ELEMENTS_MAX,
          })}
          title={t('chosen.writeTitle')}
        />
        <Step body={t('chosen.reviewBody')} title={t('chosen.reviewTitle')} />
        <Step body={t('chosen.liveBody')} title={t('chosen.liveTitle')} />
        <Step body={t('chosen.afterBody')} title={t('chosen.afterTitle')} />

        {/*
          The reassurances, listed rather than buried in a paragraph. These are
          the four things people assume are true of any app like this, and all
          four are false here — which is only worth anything if it is said
          plainly and before somebody has to trust it.
        */}
        <View style={{ marginTop: theme.spacing.xxxl, gap: theme.spacing.md }}>
          <Text variant="title3">{t('chosen.neverTitle')}</Text>
          {nevers.map((key) => (
            <Text color="textSecondary" key={key}>
              · {t(`chosen.${key}`)}
            </Text>
          ))}
        </View>

        <View
          style={{
            marginTop: theme.spacing.xxxl,
            paddingTop: theme.spacing.lg,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.border,
          }}
        >
          <Text color="textTertiary" variant="footnote">
            {t('chosen.reassure')}
          </Text>
        </View>
      </Screen>
    </>
  );
}
