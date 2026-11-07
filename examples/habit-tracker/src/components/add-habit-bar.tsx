import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

export function AddHabitBar({ onAdd }: { onAdd: (name: string) => void }) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const canAdd = name.trim().length > 0;

  const submit = () => {
    if (!canAdd) {
      return;
    }
    onAdd(name.trim());
    setName('');
  };

  return (
    <View style={[styles.bar, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <TextInput
        accessibilityLabel="New habit"
        placeholder="New habit"
        placeholderTextColor={theme.textSecondary}
        selectionColor={theme.accent}
        value={name}
        onChangeText={setName}
        onSubmitEditing={submit}
        returnKeyType="done"
        maxLength={60}
        style={[styles.input, { color: theme.text }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add habit"
        accessibilityState={{ disabled: !canAdd }}
        disabled={!canAdd}
        onPress={submit}
        style={({ pressed }) => [
          styles.add,
          { backgroundColor: theme.accent, opacity: !canAdd ? 0.4 : pressed ? 0.8 : 1 },
        ]}>
        <Text style={[styles.addLabel, { color: theme.onAccent }]}>Add</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xs,
    paddingLeft: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    fontSize: 16,
  },
  add: {
    paddingHorizontal: spacing.lg,
    minHeight: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
  },
  addLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});
