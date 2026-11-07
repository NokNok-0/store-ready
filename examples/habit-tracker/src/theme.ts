import { useColorScheme } from 'react-native';

export type Palette = {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  danger: string;
};

const palettes: Record<'light' | 'dark', Palette> = {
  light: {
    background: '#F6F5F2',
    card: '#FFFFFF',
    text: '#1B1A18',
    textSecondary: '#6F6B65',
    border: '#E4E1DB',
    accent: '#E8590C',
    accentSoft: '#FDE8DC',
    onAccent: '#FFFFFF',
    danger: '#D93025',
  },
  dark: {
    background: '#111110',
    card: '#1C1B1A',
    text: '#F3F1EE',
    textSecondary: '#A19C95',
    border: '#2E2C2A',
    accent: '#FF7A33',
    accentSoft: '#3A2418',
    onAccent: '#1B1A18',
    danger: '#FF6B5E',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 40,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export function useTheme(): Palette {
  return palettes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
