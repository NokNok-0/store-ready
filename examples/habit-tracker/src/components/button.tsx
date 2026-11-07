import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

type Variant = 'primary' | 'secondary' | 'plain';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;
  const background = {
    primary: theme.accent,
    secondary: theme.card,
    plain: 'transparent',
  }[variant];
  const foreground = variant === 'primary' ? theme.onAccent : theme.accent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background, opacity: inactive ? 0.5 : pressed ? 0.8 : 1 },
        variant === 'secondary' && { borderColor: theme.border, borderWidth: StyleSheet.hairlineWidth },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text style={[styles.label, { color: variant === 'secondary' ? theme.text : foreground }]}>
          {icon ? <Text style={[styles.icon, { color: foreground }]}>{icon}  </Text> : null}
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    fontWeight: '800',
  },
});
