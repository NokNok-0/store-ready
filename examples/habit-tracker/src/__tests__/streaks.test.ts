import {
  currentStreak,
  isCompletedOn,
  longestStreak,
  toDayKey,
  toggleCompletion,
} from '@/streaks';

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date, 9, 30);

describe('toDayKey', () => {
  it('formats local dates with zero padding', () => {
    expect(toDayKey(day(2026, 3, 7))).toBe('2026-03-07');
    expect(toDayKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
});

describe('currentStreak', () => {
  const today = day(2026, 11, 7);

  it('is zero with no completions', () => {
    expect(currentStreak([], today)).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(currentStreak(['2026-11-05', '2026-11-06', '2026-11-07'], today)).toBe(3);
  });

  it('keeps the streak alive until today is over', () => {
    expect(currentStreak(['2026-11-05', '2026-11-06'], today)).toBe(2);
  });

  it('resets after a missed day', () => {
    expect(currentStreak(['2026-11-03', '2026-11-04', '2026-11-05'], today)).toBe(0);
    expect(currentStreak(['2026-11-03', '2026-11-05', '2026-11-06', '2026-11-07'], today)).toBe(3);
  });

  it('ignores duplicates and order', () => {
    expect(currentStreak(['2026-11-07', '2026-11-06', '2026-11-07'], today)).toBe(2);
  });

  it('crosses month and leap-day boundaries', () => {
    expect(currentStreak(['2028-02-28', '2028-02-29', '2028-03-01'], day(2028, 3, 1))).toBe(3);
    expect(currentStreak(['2026-12-31', '2027-01-01'], day(2027, 1, 1))).toBe(2);
  });
});

describe('longestStreak', () => {
  it('finds the longest run anywhere in history', () => {
    expect(
      longestStreak(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-10', '2026-10-11']),
    ).toBe(3);
  });

  it('is zero for an empty history', () => {
    expect(longestStreak([])).toBe(0);
  });

  it('handles unsorted input across a month boundary', () => {
    expect(longestStreak(['2026-11-01', '2026-10-30', '2026-10-31', '2026-10-31'])).toBe(3);
  });
});

describe('toggleCompletion', () => {
  it('adds a missing day in sorted order', () => {
    expect(toggleCompletion(['2026-11-07'], '2026-11-06')).toEqual(['2026-11-06', '2026-11-07']);
  });

  it('removes a completed day', () => {
    const next = toggleCompletion(['2026-11-06', '2026-11-07'], '2026-11-07');
    expect(next).toEqual(['2026-11-06']);
    expect(isCompletedOn(next, '2026-11-07')).toBe(false);
  });
});
