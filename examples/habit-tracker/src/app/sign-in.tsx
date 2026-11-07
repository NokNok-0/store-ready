import { AuthFooter } from '@/components/auth-footer';
import { AuthForm } from '@/components/auth-form';
import { AuthScreen } from '@/components/auth-screen';
import { SocialSignIn } from '@/components/social-sign-in';
import { useSession } from '@/session';

export default function SignInScreen() {
  const { signIn } = useSession();

  return (
    <AuthScreen
      title="Streaks"
      subtitle="Small habits, every day."
      footer={<AuthFooter prompt="New to Streaks?" action="Create an account" href="/sign-up" />}>
      <AuthForm submitLabel="Sign in" passwordPlaceholder="Your password" onSubmit={signIn} />
      <SocialSignIn />
    </AuthScreen>
  );
}
