import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, useColorScheme } from 'react-native';

import { radius } from '@/theme';

type AppleSignInButtonProps = {
  onCredential: (credential: AppleAuthentication.AppleAuthenticationCredential) => Promise<void>;
  onError: (error: unknown) => void;
};

export function useAppleSignInAvailable(): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAvailable);
    }
  }, []);

  return available;
}

export function AppleSignInButton({ onCredential, onError }: AppleSignInButtonProps) {
  const scheme = useColorScheme();

  const signIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      await onCredential(credential);
    } catch (error) {
      if ((error as { code?: string }).code !== 'ERR_REQUEST_CANCELED') {
        onError(error);
      }
    }
  };

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={
        scheme === 'dark'
          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      }
      cornerRadius={radius.md}
      style={styles.button}
      onPress={signIn}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
  },
});
