import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HabitThumbnail } from '@/components/habit-thumbnail';
import type { Habit } from '@/habit-store';
import { currentStreak, isCompletedOn, toDayKey } from '@/streaks';
import { radius, spacing, useTheme } from '@/theme';

type HabitRowProps = {
  habit: Habit;
  onToggle: () => void;
  onOpen: () => void;
};

function streakLabel(streak: number): string {
  if (streak === 0) {
    return 'Start a streak today';
  }
  return `${streak} day streak`;
}

export function HabitRow({ habit, onToggle, onOpen }: HabitRowProps) {
  const theme = useTheme();
  const done = isCompletedOn(habit.completions, toDayKey(new Date()));
  const streak = currentStreak(habit.completions);

  return (
    <View style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens habit details"
        onPress={onOpen}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.7 : 1 }]}>
        <HabitThumbnail habit={habit} size={48} />
        <View style={styles.text}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {habit.name}
          </Text>
          <Text style={[styles.streak, { color: streak > 0 ? theme.accent : theme.textSecondary }]}>
            {streakLabel(streak)}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`Done today: ${habit.name}`}
        accessibilityState={{ checked: done }}
        hitSlop={spacing.sm}
        onPress={onToggle}
        style={[
          styles.check,
          done
            ? { backgroundColor: theme.accent, borderColor: theme.accent }
            : { borderColor: theme.border },
        ]}>
        {done ? <Text style={[styles.checkMark, { color: theme.onAccent }]}>✓</Text> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
  },
  streak: {
    fontSize: 14,
    fontWeight: '500',
  },
  check: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 18,
    fontWeight: '800',
  },
});
