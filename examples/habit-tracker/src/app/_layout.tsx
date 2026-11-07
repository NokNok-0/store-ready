import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { HabitsProvider } from '@/habits-context';
import { SessionProvider, useSession } from '@/session';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigator />
    </SessionProvider>
  );
}

function RootNavigator() {
  const { user, isLoading } = useSession();
  const scheme = useColorScheme();
  const theme = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: theme.accent,
          background: theme.background,
          card: theme.background,
          text: theme.text,
          border: theme.border,
        },
      }}>
      <HabitsProvider userId={user?.id ?? null}>
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerTintColor: theme.accent,
            headerTitleStyle: { color: theme.text },
            contentStyle: { backgroundColor: theme.background },
          }}>
          <Stack.Protected guard={!user}>
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
            <Stack.Screen name="sign-up" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!!user}>
            <Stack.Screen name="index" options={{ title: 'Today' }} />
            <Stack.Screen name="habit/[id]" options={{ title: 'Habit' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            <Stack.Screen name="about" options={{ title: 'About' }} />
            <Stack.Screen name="delete-account" options={{ title: 'Delete account' }} />
          </Stack.Protected>
        </Stack>
      </HabitsProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
