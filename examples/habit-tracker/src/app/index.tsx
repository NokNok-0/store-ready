import { Stack, useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { AddHabitBar } from '@/components/add-habit-bar';
import { HabitRow } from '@/components/habit-row';
import { HeaderButton } from '@/components/header-button';
import { FREE_HABIT_LIMIT } from '@/habit-store';
import { useHabits } from '@/habits-context';
import { isCompletedOn, toDayKey } from '@/streaks';
import { spacing, useTheme } from '@/theme';

function formatToday(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function HabitsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { habits, isLoading, addHabit, toggleToday } = useHabits();
  const now = new Date();
  const today = toDayKey(now);
  const doneCount = habits.filter((habit) => isCompletedOn(habit.completions, today)).length;

  const add = (name: string) => {
    if (habits.length >= FREE_HABIT_LIMIT) {
      router.push('/paywall');
      return;
    }
    addHabit(name);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderButton label="Settings" onPress={() => router.push('/settings')} />
          ),
        }}
      />
      <FlatList
        data={habits}
        keyExtractor={(habit) => habit.id}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.date, { color: theme.textSecondary }]}>{formatToday(now)}</Text>
            <Text style={[styles.summary, { color: theme.text }]}>
              {habits.length === 0 ? 'Add your first habit' : `${doneCount} of ${habits.length} done`}
            </Text>
            <AddHabitBar onAdd={add} />
          </View>
        }
        ListEmptyComponent={
          isLoading ? undefined : (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No habits yet</Text>
              <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
                Pick something small you want to do every day, like a 10-minute walk.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <HabitRow
            habit={item}
            onToggle={() => toggleToday(item.id)}
            onOpen={() => router.push({ pathname: '/habit/[id]', params: { id: item.id } })}
          />
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  date: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summary: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
});
