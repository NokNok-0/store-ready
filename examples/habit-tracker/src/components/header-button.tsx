import { Pressable, StyleSheet, Text } from 'react-native';

import { spacing, useTheme } from '@/theme';

export function HeaderButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={spacing.sm}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.6 : 1 }]}>
      <Text style={[styles.label, { color: theme.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: spacing.sm,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
