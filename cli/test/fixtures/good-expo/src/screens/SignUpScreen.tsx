import { Button, Text, View } from 'react-native';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';

export function SignUpScreen({ email, password }: { email: string; password: string }) {
  return (
    <View>
      <Text>Create account</Text>
      <Button title="Sign up" onPress={() => createUserWithEmailAndPassword(getAuth(), email, password)} />
    </View>
  );
}
