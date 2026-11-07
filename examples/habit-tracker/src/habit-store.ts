import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DayKey } from '@/streaks';

export type Habit = {
  id: string;
  name: string;
  createdAt: string;
  completions: DayKey[];
  photoUri?: string;
};

const storageKey = (userId: string) => `streaks:habits:${userId}`;

export async function loadHabits(userId: string): Promise<Habit[]> {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  return raw ? (JSON.parse(raw) as Habit[]) : [];
}

export async function saveHabits(userId: string, habits: Habit[]): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(habits));
}

export async function deleteHabits(userId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(userId));
}

export function createHabit(name: string, now: Date = new Date()): Habit {
  return {
    id: `${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    createdAt: now.toISOString(),
    completions: [],
  };
}
