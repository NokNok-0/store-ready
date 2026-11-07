import { AuthError, deleteMockUser, getCurrentUser } from '@/auth';
import { deleteHabits, loadHabits } from '@/habit-store';
import { deletePhotos } from '@/photos';

export async function deleteAccount(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError('Sign in again to delete your account.');
  }
  const habits = await loadHabits(user.id);
  deletePhotos(habits.flatMap((habit) => (habit.photoUri ? [habit.photoUri] : [])));
  await deleteHabits(user.id);
  await deleteMockUser(user.id);
}
