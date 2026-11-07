import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import HabitsScreen from '@/app/index';
import { HabitsProvider } from '@/habits-context';

function TestLayout() {
  return (
    <HabitsProvider userId="test-user">
      <Stack />
    </HabitsProvider>
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

it('renders the empty habits screen', async () => {
  await renderRouter({ _layout: TestLayout, index: HabitsScreen });

  expect(await screen.findByText('No habits yet')).toBeOnTheScreen();
  expect(screen.getByText('Add your first habit')).toBeOnTheScreen();
});

it('adds a habit, saves it, and checks it off for today', async () => {
  await renderRouter({ _layout: TestLayout, index: HabitsScreen });
  await screen.findByText('No habits yet');

  await fireEvent.changeText(screen.getByLabelText('New habit'), 'Read 10 pages');
  await fireEvent.press(screen.getByRole('button', { name: 'Add habit' }));

  expect(await screen.findByText('Read 10 pages')).toBeOnTheScreen();
  expect(screen.getByText('0 of 1 done')).toBeOnTheScreen();
  expect(screen.getByText('Start a streak today')).toBeOnTheScreen();

  const stored = JSON.parse((await AsyncStorage.getItem('streaks:habits:test-user')) ?? '[]');
  expect(stored).toEqual([expect.objectContaining({ name: 'Read 10 pages', completions: [] })]);

  await fireEvent.press(screen.getByRole('checkbox', { name: 'Done today: Read 10 pages' }));

  expect(await screen.findByText('1 day streak')).toBeOnTheScreen();
  expect(screen.getByText('1 of 1 done')).toBeOnTheScreen();
});
