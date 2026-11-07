import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

type TextFieldProps = TextInputProps & { label: string };

export function TextField({ label, style, ...inputProps }: TextFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.textSecondary}
        selectionColor={theme.accent}
        style={[
          styles.input,
          { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
          style,
        ]}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
  },
});
