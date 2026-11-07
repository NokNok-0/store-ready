import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export function LoginButtons() {
  return (
    <>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={8}
        style={{ height: 44 }}
        onPress={() => AppleAuthentication.signInAsync()}
      />
      <GoogleButton onPress={() => GoogleSignin.signIn()} />
    </>
  );
}

function GoogleButton({ onPress }: { onPress: () => void }) {
  return null;
}
