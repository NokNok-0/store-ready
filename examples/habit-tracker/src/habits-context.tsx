import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { createHabit, loadHabits, saveHabits, type Habit } from '@/habit-store';
import { toDayKey, toggleCompletion } from '@/streaks';

type HabitsValue = {
  habits: Habit[];
  isLoading: boolean;
  addHabit: (name: string) => void;
  toggleToday: (id: string) => void;
  setPhoto: (id: string, uri: string) => void;
  removeHabit: (id: string) => void;
};

const HabitsContext = createContext<HabitsValue | null>(null);

export function HabitsProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setHabits([]);
    if (!userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    loadHabits(userId).then((stored) => {
      if (active) {
        setHabits(stored);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const update = (change: (current: Habit[]) => Habit[]) => {
    const next = change(habits);
    setHabits(next);
    if (userId) {
      void saveHabits(userId, next);
    }
  };

  const updateHabit = (id: string, change: (habit: Habit) => Habit) =>
    update((current) => current.map((habit) => (habit.id === id ? change(habit) : habit)));

  const value: HabitsValue = {
    habits,
    isLoading,
    addHabit: (name) => update((current) => [...current, createHabit(name)]),
    toggleToday: (id) =>
      updateHabit(id, (habit) => ({
        ...habit,
        completions: toggleCompletion(habit.completions, toDayKey(new Date())),
      })),
    setPhoto: (id, uri) => updateHabit(id, (habit) => ({ ...habit, photoUri: uri })),
    removeHabit: (id) => update((current) => current.filter((habit) => habit.id !== id)),
  };

  return <HabitsContext value={value}>{children}</HabitsContext>;
}

export function useHabits(): HabitsValue {
  const value = use(HabitsContext);
  if (!value) {
    throw new Error('useHabits must be used inside HabitsProvider');
  }
  return value;
}
