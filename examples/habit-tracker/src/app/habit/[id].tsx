import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { HabitThumbnail } from '@/components/habit-thumbnail';
import { SettingsGroup, SettingsRow } from '@/components/settings-row';
import { StatTile } from '@/components/stat-tile';
import { confirm } from '@/confirm';
import { useHabits } from '@/habits-context';
import { pickPhoto, type PhotoSource } from '@/photos';
import { currentStreak, isCompletedOn, longestStreak, toDayKey } from '@/streaks';
import { spacing, useTheme } from '@/theme';

const deniedMessages: Record<PhotoSource, string> = {
  camera: 'Camera access is off. You can turn it on in Settings.',
  library: 'Photo access is off. You can turn it on in Settings.',
};

export default function HabitDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { habits, setPhoto, removeHabit, toggleToday } = useHabits();
  const [notice, setNotice] = useState<string | null>(null);
  const habit = habits.find((candidate) => candidate.id === id);

  if (!habit) {
    return (
      <View style={styles.missing}>
        <Text style={{ color: theme.textSecondary }}>This habit no longer exists.</Text>
      </View>
    );
  }

  const doneToday = isCompletedOn(habit.completions, toDayKey(new Date()));

  const choosePhoto = async (source: PhotoSource) => {
    setNotice(null);
    const result = await pickPhoto(source);
    if (result.status === 'picked') {
      setPhoto(habit.id, result.uri);
    } else if (result.status === 'denied') {
      setNotice(deniedMessages[source]);
    }
  };

  const deleteHabit = async () => {
    const confirmed = await confirm(
      'Delete habit?',
      `"${habit.name}" and its history will be removed.`,
      'Delete',
    );
    if (confirmed) {
      removeHabit(habit.id);
      router.back();
    }
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: habit.name }} />
      <View style={styles.hero}>
        <HabitThumbnail habit={habit} size={168} />
      </View>
      <View style={styles.photoButtons}>
        <Button
          label="Take photo"
          variant="secondary"
          onPress={() => choosePhoto('camera')}
          style={styles.flex}
        />
        <Button
          label="Choose photo"
          variant="secondary"
          onPress={() => choosePhoto('library')}
          style={styles.flex}
        />
      </View>
      {notice ? <Text style={[styles.notice, { color: theme.textSecondary }]}>{notice}</Text> : null}
      <View style={styles.stats}>
        <StatTile label="Current" value={currentStreak(habit.completions)} />
        <StatTile label="Best" value={longestStreak(habit.completions)} />
        <StatTile label="Check-ins" value={habit.completions.length} />
      </View>
      <Button
        label={doneToday ? 'Done today ✓' : 'Mark done today'}
        variant={doneToday ? 'secondary' : 'primary'}
        onPress={() => toggleToday(habit.id)}
      />
      <SettingsGroup>
        <SettingsRow label="Delete habit" destructive onPress={deleteHabit} />
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
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  notice: {
    fontSize: 14,
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
