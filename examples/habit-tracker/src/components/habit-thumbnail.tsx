import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import type { Habit } from '@/habit-store';
import { useTheme } from '@/theme';

export function HabitThumbnail({ habit, size }: { habit: Habit; size: number }) {
  const theme = useTheme();
  const shape = { width: size, height: size, borderRadius: size * 0.3 };

  if (habit.photoUri) {
    return <Image source={{ uri: habit.photoUri }} style={shape} contentFit="cover" />;
  }

  return (
    <View style={[styles.placeholder, shape, { backgroundColor: theme.accentSoft }]}>
      <Text style={[styles.initial, { color: theme.accent, fontSize: size * 0.42 }]}>
        {habit.name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontWeight: '700',
  },
});
