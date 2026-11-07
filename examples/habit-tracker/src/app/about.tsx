import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { SettingsGroup, SettingsRow } from '@/components/settings-row';
import { spacing, useTheme } from '@/theme';

export default function AboutScreen() {
  const theme = useTheme();

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text }]}>Streaks</Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        Streaks helps you build habits by checking them off once a day. Your habits and photos are
        stored on this device.
      </Text>
      <SettingsGroup>
        <SettingsRow label="Version" value={Constants.expoConfig?.version ?? '1.0.0'} />
      </SettingsGroup>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
  },
});
