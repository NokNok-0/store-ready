import { Button, Text, View } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '../supabase';

export function RegisterScreen({ email, password }: { email: string; password: string }) {
  return (
    <View>
      <Button title="Sign up" onPress={() => supabase.auth.signUp({ email, password })} />
      <Button title="Continue with Google" onPress={() => GoogleSignin.signIn()} />
      <Text>Premium plans are coming soon.</Text>
    </View>
  );
}
