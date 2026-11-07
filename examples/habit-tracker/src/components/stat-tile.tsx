import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

export function StatTile({ label, value }: { label: string; value: number }) {
  const theme = useTheme();

  return (
    <View style={[styles.tile, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  value: {
    fontSize: 26,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
});
