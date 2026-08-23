import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { CountryBadge } from '@/components/human/CountryBadge';
import { LanguageSelector } from '@/components/shared/LanguageSelector';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { websiteLinks } from '@/constants/links';
import { signOut } from '@/features/auth/api';
import { useSession } from '@/features/auth/useSession';
import { useAmIModerator } from '@/features/moderation/hooks';
import { useAmIFounding, useMyProfile } from '@/features/profiles/hooks';
import { projectRef } from '@/lib/env';
import { useTheme } from '@/theme';

function openWebsite(href: string) {
  void Linking.openURL(href).catch(() => undefined);
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const session = useSession();
  const { data: profile, isLoading } = useMyProfile();
  const { data: isModerator } = useAmIModerator();
  const { data: isFounding } = useAmIFounding();
  const authenticated = session.status === 'authenticated';

  return (
    <Screen>
      <PageHeader
        eyebrow={t('tabs.you')}
        subtitle={t('settings.subtitle')}
        title={
          authenticated && profile ? profile.display_name : t('settings.title')
        }
      />

      {authenticated && profile ? (
        <Surface tone="accent" style={{ gap: theme.spacing.lg }}>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: theme.spacing.lg,
            }}
          >
            <Avatar name={profile.display_name} size="lg" />
            <View style={{ flex: 1, gap: theme.spacing.xs }}>
              <Text variant="title3" style={{ fontWeight: '600' }}>
                {profile.display_name}
              </Text>
              <Text color="textSecondary" variant="footnote">
                @{profile.username}
              </Text>
              <CountryBadge countryCode={profile.country_code} />
            </View>
          </View>
          {profile.bio_short ? (
            <Text color="textSecondary">{profile.bio_short}</Text>
          ) : null}
          {isFounding === true ? (
            <View style={{ gap: theme.spacing.xs }}>
              <Text
                color="accent"
                variant="footnote"
                style={{ fontWeight: '600' }}
              >
                {t('founding.yours')}
              </Text>
              <Text color="textTertiary" variant="caption">
                {t('founding.explain')}
              </Text>
            </View>
          ) : null}
          <Button
            icon="edit-2"
            label={t('profile.edit')}
            onPress={() => router.push('/settings/profile')}
            variant="secondary"
          />
        </Surface>
      ) : session.status === 'guest' ? (
        <Surface tone="accent" style={{ gap: theme.spacing.md }}>
          <Text variant="title3" style={{ fontWeight: '600' }}>
            {t('settings.guestTitle')}
          </Text>
          <Text color="textSecondary">{t('auth.guestNotice')}</Text>
          <Button
            icon="log-in"
            label={t('auth.signIn')}
            onPress={() => router.push('/(auth)/sign-in')}
          />
        </Surface>
      ) : !isLoading && profile === null ? (
        <Surface tone="accent" style={{ gap: theme.spacing.md }}>
          <Text variant="title3">{t('profile.title')}</Text>
          <Text color="textSecondary">{t('profile.subtitle')}</Text>
          <Button
            label={t('profile.finish')}
            onPress={() => router.push('/(onboarding)/profile')}
          />
        </Surface>
      ) : null}

      <View style={{ gap: theme.spacing.xxl, marginTop: theme.spacing.xxl }}>
        {authenticated && profile ? (
          <ListGroup label={t('settings.account')}>
            <ListRow
              first
              icon="user"
              onPress={() => router.push('/settings/profile')}
              {...(session.session?.user.email
                ? { subtitle: session.session.user.email }
                : {})}
              title={t('settings.profile')}
            />
            <ListRow
              icon="compass"
              onPress={() => router.push('/settings/eligibility')}
              subtitle={t('settings.eligibilityHint')}
              title={t('settings.eligibility')}
            />
            <ListRow
              icon="award"
              onPress={() => router.push('/if-you-are-chosen')}
              title={t('chosen.title')}
            />
          </ListGroup>
        ) : null}

        <ListGroup label={t('settings.experience')}>
          <ListRow
            first
            icon="bell"
            onPress={() => router.push('/settings/notifications')}
            subtitle={t('settings.notificationsHint')}
            title={t('settings.notifications')}
          />
          <ListRow
            icon="moon"
            onPress={() => router.push('/settings/appearance')}
            title={t('settings.appearance')}
          />
        </ListGroup>

        <View style={{ gap: theme.spacing.sm }}>
          <Text
            color="textTertiary"
            variant="caption"
            style={{ fontWeight: '700', letterSpacing: 1.1, marginLeft: 4 }}
          >
            {t('settings.language').toUpperCase()}
          </Text>
          <LanguageSelector />
        </View>

        <ListGroup label={t('settings.privacySafety')}>
          <ListRow
            first
            icon="shield"
            onPress={() => router.push('/settings/privacy')}
            subtitle={t('settings.privacyHint')}
            title={t('settings.privacy')}
          />
          <ListRow
            icon="users"
            onPress={() => router.push('/settings/community-rules')}
            title={t('settings.communityRules')}
          />
          {isModerator ? (
            <ListRow
              icon="eye"
              onPress={() => router.push('/admin')}
              title={t('settings.moderation')}
            />
          ) : null}
        </ListGroup>

        <ListGroup label={t('settings.aboutUnumae')}>
          <ListRow
            first
            icon="shuffle"
            onPress={() => router.push('/how-selection-works')}
            title={t('settings.howSelectionWorks')}
          />
          <ListRow
            icon="info"
            onPress={() => openWebsite(websiteLinks.about)}
            title={t('settings.about')}
          />
          <ListRow
            icon="file-text"
            onPress={() => openWebsite(websiteLinks.terms)}
            title={t('legal.termsTitle')}
          />
          <ListRow
            icon="lock"
            onPress={() => openWebsite(websiteLinks.privacy)}
            title={t('legal.privacyTitle')}
          />
        </ListGroup>

        {authenticated ? (
          <ListGroup label={t('settings.accountActions')}>
            <ListRow
              first
              icon="log-out"
              onPress={() => void signOut()}
              title={t('auth.signOut')}
            />
            <ListRow
              destructive
              icon="trash-2"
              onPress={() => router.push('/settings/account')}
              title={t('settings.deleteAccount')}
            />
          </ListGroup>
        ) : null}

        {__DEV__ ? (
          <ListGroup label={t('settings.developer')}>
            <ListRow
              first
              icon="database"
              title={`${t('settings.project')}: ${projectRef}`}
            />
            <ListRow
              icon="grid"
              onPress={() => router.push('/dev/components')}
              title={t('settings.components')}
            />
            <ListRow
              icon="layers"
              onPress={() => router.push('/dev/tokens')}
              title={t('settings.designTokens')}
            />
            <ListRow
              icon="eye"
              onPress={() => router.push('/dev/preview')}
              title={t('settings.uxPreview')}
            />
          </ListGroup>
        ) : null}
      </View>
    </Screen>
  );
}
