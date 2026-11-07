import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

type SettingsRowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
};

export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  const theme = useTheme();

  return (
    <View style={styles.group}>
      {title ? <Text style={[styles.title, { color: theme.textSecondary }]}>{title}</Text> : null}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {Children.toArray(children).map((child, index) => (
          <Fragment key={index}>
            {index > 0 ? (
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
            ) : null}
            {child}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

export function SettingsRow({ label, value, onPress, destructive = false }: SettingsRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <Text style={[styles.label, { color: destructive ? theme.danger : theme.text }]}>{label}</Text>
      <View style={styles.trailing}>
        {value ? (
          <Text style={[styles.value, { color: theme.textSecondary }]} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {onPress && !destructive ? (
          <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontSize: 16,
  },
  trailing: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  value: {
    fontSize: 16,
    flexShrink: 1,
  },
  chevron: {
    fontSize: 22,
    lineHeight: 24,
  },
});
