import { Button, Linking, View } from 'react-native';
import { deleteUser, getAuth } from 'firebase/auth';

const PRIVACY_POLICY = 'https://habitlens.app/privacy';

export function SettingsScreen() {
  const user = getAuth().currentUser;
  return (
    <View>
      <Button title="Privacy policy" onPress={() => Linking.openURL(PRIVACY_POLICY)} />
      <Button title="Delete account" onPress={() => user && deleteUser(user)} />
    </View>
  );
}
