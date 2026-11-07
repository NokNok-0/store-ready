import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/components/auth-form';
import { Button } from '@/components/button';
import { useSession } from '@/session';
import { spacing, useTheme } from '@/theme';

export function SocialSignIn() {
  const theme = useTheme();
  const { signInWithGoogle } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continueWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (caught) {
      setError(errorMessage(caught));
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
        <Text style={[styles.or, { color: theme.textSecondary }]}>or</Text>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
      </View>
      <Button
        label="Continue with Google"
        icon="G"
        variant="secondary"
        onPress={continueWithGoogle}
        loading={loading}
      />
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  or: {
    fontSize: 13,
  },
  error: {
    fontSize: 14,
  },
});
