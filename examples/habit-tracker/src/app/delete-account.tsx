import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/button';
import { confirm } from '@/confirm';
import { DELETE_ACCOUNT_URL } from '@/links';
import { useSession } from '@/session';
import { spacing, useTheme } from '@/theme';

export default function DeleteAccountScreen() {
  const theme = useTheme();
  const { user, deleteAccount } = useSession();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmAndDelete = async () => {
    const confirmed = await confirm(
      'Delete your account?',
      'Your account, habits, check-ins and photos will be permanently deleted from this device. This cannot be undone.',
      'Delete account',
    );
    if (!confirmed) {
      return;
    }
    setError(null);
    setDeleting(true);
    try {
      await deleteAccount();
    } catch {
      setError('Your account could not be deleted. You are still signed in. Try again.');
      setDeleting(false);
    }
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text }]}>Delete account</Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        Deleting your account removes your Streaks profile{user?.email ? ` (${user.email})` : ''}, every
        habit, its check-in history and the photos you added. Streaks keeps all of this on this device
        only, so nothing is kept anywhere else after deletion.
      </Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        You will be signed out. You can create a new account at any time, but deleted habits cannot be
        restored.
      </Text>
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
      <Button label="Delete account" onPress={confirmAndDelete} loading={deleting} />
      <Button
        label="How deletion works"
        variant="plain"
        onPress={() => Linking.openURL(DELETE_ACCOUNT_URL)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
  },
  error: {
    fontSize: 14,
  },
});
