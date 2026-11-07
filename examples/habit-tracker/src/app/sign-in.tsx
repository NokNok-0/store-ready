import { StyleSheet, Text } from 'react-native';

import { AuthFooter } from '@/components/auth-footer';
import { AuthForm } from '@/components/auth-form';
import { AuthScreen } from '@/components/auth-screen';
import { SocialSignIn } from '@/components/social-sign-in';
import { useSession } from '@/session';
import { useTheme } from '@/theme';

export default function SignInScreen() {
  const theme = useTheme();
  const { signIn, accountDeleted } = useSession();

  return (
    <AuthScreen
      title="Streaks"
      subtitle="Small habits, every day."
      footer={<AuthFooter prompt="New to Streaks?" action="Create an account" href="/sign-up" />}>
      {accountDeleted ? (
        <Text style={[styles.notice, { color: theme.textSecondary }]}>
          Your account and its data were deleted.
        </Text>
      ) : null}
      <AuthForm submitLabel="Sign in" passwordPlaceholder="Your password" onSubmit={signIn} />
      <SocialSignIn />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  notice: {
    fontSize: 15,
    textAlign: 'center',
  },
});
