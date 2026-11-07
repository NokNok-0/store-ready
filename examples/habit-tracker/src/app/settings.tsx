import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { SettingsGroup, SettingsRow } from '@/components/settings-row';
import { useSession } from '@/session';
import { spacing } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useSession();

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <SettingsGroup title="Account">
        <SettingsRow label="Email" value={user?.email} />
        <SettingsRow label="Signed in with" value={user?.provider === 'google' ? 'Google' : 'Email'} />
      </SettingsGroup>
      <SettingsGroup title="Plan">
        <SettingsRow label="Streaks Pro" value="Free plan" onPress={() => router.push('/paywall')} />
      </SettingsGroup>
      <SettingsGroup>
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
