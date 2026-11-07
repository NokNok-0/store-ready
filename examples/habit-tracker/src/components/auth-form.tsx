import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthError } from '@/auth';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { spacing, useTheme } from '@/theme';

type AuthFormProps = {
  submitLabel: string;
  passwordPlaceholder: string;
  onSubmit: (email: string, password: string) => Promise<void>;
};

export function errorMessage(error: unknown): string {
  return error instanceof AuthError ? error.message : 'Something went wrong. Try again.';
}

export function AuthForm({ submitLabel, passwordPlaceholder, onSubmit }: AuthFormProps) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(email, password);
    } catch (caught) {
      setError(errorMessage(caught));
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      <TextField
        label="Email"
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />
      <TextField
        label="Password"
        placeholder={passwordPlaceholder}
        autoCapitalize="none"
        secureTextEntry
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={submit}
      />
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
      <Button label={submitLabel} onPress={submit} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  error: {
    fontSize: 14,
  },
});
