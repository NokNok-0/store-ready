import { Link, type Href } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { useTheme } from '@/theme';

export function AuthFooter({ prompt, action, href }: { prompt: string; action: string; href: Href }) {
  const theme = useTheme();

  return (
    <Text style={[styles.text, { color: theme.textSecondary }]}>
      {prompt}{' '}
      <Link href={href} replace style={[styles.link, { color: theme.accent }]}>
        {action}
      </Link>
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 15,
  },
  link: {
    fontWeight: '600',
  },
});
