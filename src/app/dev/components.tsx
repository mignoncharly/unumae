import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CountryBadge } from '@/components/human/CountryBadge';
import { SelectingHuman } from '@/components/human/SelectingHuman';
import { Timer } from '@/components/human/Timer';
import { QuestionCard } from '@/components/questions/QuestionCard';
import { LanguageSelector } from '@/components/shared/LanguageSelector';
import { ReportAction } from '@/components/shared/ReportAction';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { AppError } from '@/lib/errors';
import { useTheme } from '@/theme';

/**
 * Component gallery. Developer surface — hardcoded English is deliberate here
 * (see dev/preview.tsx for the rationale).
 */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
      <Text color="textTertiary" variant="footnote">
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

export default function ComponentsScreen() {
  const theme = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [voted, setVoted] = useState(false);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Components' }} />
      <Screen>
        <Section title="Button">
          <Button label="Primary" onPress={() => {}} />
          <Button label="Secondary" onPress={() => {}} variant="secondary" />
          <Button disabled label="Disabled" onPress={() => {}} />
        </Section>

        <Section title="Avatar">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
            }}
          >
            <Avatar name="Aya" size="sm" />
            <Avatar name="Bashir" size="md" />
            <Avatar name="Chidi" size="lg" />
            <Avatar name="Dilara" size="xl" />
          </View>
        </Section>

        <Section title="CountryBadge">
          <CountryBadge city="Kyoto" countryCode="JP" />
          <CountryBadge countryCode="CM" />
          <CountryBadge countryCode="BR" />
          <CountryBadge countryCode="DE" showFlag={false} />
        </Section>

        <Section title="Timer">
          <Timer />
        </Section>

        <Section title="Skeleton">
          <Skeleton height={28} width="60%" />
          <Skeleton />
          <Skeleton width="80%" />
        </Section>

        <Section title="QuestionCard">
          <QuestionCard
            answer="That we are careful, not formal."
            canVote
            hasVoted={voted}
            onVote={() => setVoted((previous) => !previous)}
            question="What is something people misunderstand about your country?"
            votes={voted ? 343 : 342}
          />
          <QuestionCard
            canVote={false}
            hasVoted={false}
            onVote={() => {}}
            question="Guests can read questions but not vote."
            votes={12}
          />
        </Section>

        <Section title="EmptyState">
          <EmptyState
            action={{ label: 'Meet a random Human', onPress: () => {} }}
            body="It begins with Human #0001."
            title="The Archive is still empty"
          />
        </Section>

        <Section title="ErrorState">
          <ErrorState
            error={new AppError('network', 'common.error')}
            onRetry={() => {}}
          />
        </Section>

        <Section title="Sheet / Toast">
          <Button label="Open sheet" onPress={() => setSheetOpen(true)} />
          <Button
            label="Show toast"
            onPress={() => setToastVisible(true)}
            variant="secondary"
          />
        </Section>

        <Section title="ReportAction">
          <ReportAction onBlock={() => {}} onReport={() => {}} />
        </Section>

        <Section title="LanguageSelector">
          <LanguageSelector />
        </Section>

        <Section title="SelectingHuman (ceremonial motion)">
          <SelectingHuman />
        </Section>
      </Screen>

      <Sheet
        onClose={() => setSheetOpen(false)}
        title="A sheet"
        visible={sheetOpen}
      >
        <Text color="textSecondary">
          Dismissible by tapping outside or pressing back. Nothing in this
          product traps a user in a decision.
        </Text>
      </Sheet>

      <Toast
        message="Added to your library"
        onDismiss={() => setToastVisible(false)}
        tone="success"
        visible={toastVisible}
      />
    </>
  );
}
