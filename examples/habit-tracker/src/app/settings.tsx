import { useRouter } from 'expo-router';
import { Linking, ScrollView, StyleSheet } from 'react-native';

import type { AuthProvider } from '@/auth';
import { SettingsGroup, SettingsRow } from '@/components/settings-row';
import { PRIVACY_POLICY_URL, SUPPORT_URL } from '@/links';
import { useSession } from '@/session';
import { spacing } from '@/theme';

const providerLabels: Record<AuthProvider, string> = {
  email: 'Email',
  apple: 'Apple',
};

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useSession();

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <SettingsGroup title="Account">
        <SettingsRow label="Email" value={user?.email || 'Hidden'} />
        <SettingsRow label="Signed in with" value={user ? providerLabels[user.provider] : undefined} />
        <SettingsRow label="Delete account" onPress={() => router.push('/delete-account')} />
      </SettingsGroup>
      <SettingsGroup>
        <SettingsRow label="Privacy policy" onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} />
        <SettingsRow label="Help and support" onPress={() => Linking.openURL(SUPPORT_URL)} />
        <SettingsRow label="About" onPress={() => router.push('/about')} />
      </SettingsGroup>
      <SettingsGroup>
        <SettingsRow label="Sign out" destructive onPress={signOut} />
      </SettingsGroup>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
});
