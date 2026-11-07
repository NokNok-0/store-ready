export type DayKey = string;

export function toDayKey(date: Date): DayKey {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromDayKey(key: DayKey): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function isCompletedOn(completions: readonly DayKey[], day: DayKey): boolean {
  return completions.includes(day);
}

export function toggleCompletion(completions: readonly DayKey[], day: DayKey): DayKey[] {
  if (isCompletedOn(completions, day)) {
    return completions.filter((key) => key !== day);
  }
  return [...completions, day].sort();
}

export function currentStreak(completions: readonly DayKey[], today: Date = new Date()): number {
  const done = new Set(completions);
  let cursor = done.has(toDayKey(today)) ? today : addDays(today, -1);
  let streak = 0;
  while (done.has(toDayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(completions: readonly DayKey[]): number {
  const days = [...new Set(completions)].sort();
  let best = 0;
  let run = 0;
  let previous: DayKey | null = null;
  for (const day of days) {
    run = previous !== null && toDayKey(addDays(fromDayKey(previous), 1)) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}
