import { MIN_PASSWORD_LENGTH } from '@/auth';
import { AuthFooter } from '@/components/auth-footer';
import { AuthForm } from '@/components/auth-form';
import { AuthScreen } from '@/components/auth-screen';
import { SocialSignIn } from '@/components/social-sign-in';
import { useSession } from '@/session';

export default function SignUpScreen() {
  const { signUp } = useSession();

  return (
    <AuthScreen
      title="Create account"
      subtitle="Track your habits and keep your streaks going."
      footer={<AuthFooter prompt="Already have an account?" action="Sign in" href="/sign-in" />}>
      <AuthForm
        submitLabel="Create account"
        passwordPlaceholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        onSubmit={signUp}
      />
      <SocialSignIn />
    </AuthScreen>
  );
}
