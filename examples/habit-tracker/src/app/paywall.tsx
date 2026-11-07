import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { FREE_HABIT_LIMIT } from '@/habit-store';
import { radius, spacing, useTheme } from '@/theme';

const features = ['Unlimited habits', 'Everything in the free plan'];

export default function PaywallScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.badge, { backgroundColor: theme.accent }]}>
        <Text style={styles.badgeGlyph}>🔥</Text>
      </View>
      <Text style={[styles.title, { color: theme.text }]}>Streaks Pro</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Pro unlocks unlimited habits. The free plan includes up to {FREE_HABIT_LIMIT}.
      </Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {features.map((feature) => (
          <View key={feature} style={styles.feature}>
            <Text style={[styles.check, { color: theme.accent }]}>✓</Text>
            <Text style={[styles.featureText, { color: theme.text }]}>{feature}</Text>
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        <Button label="Subscribe" onPress={() => undefined} disabled />
        <Text style={[styles.caption, { color: theme.textSecondary }]}>
          Subscriptions are not available yet.
        </Text>
        <Button label="Not now" variant="plain" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'stretch',
    gap: spacing.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  badgeGlyph: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  check: {
    fontSize: 16,
    fontWeight: '800',
  },
  featureText: {
    fontSize: 16,
  },
  actions: {
    gap: spacing.sm,
  },
  caption: {
    fontSize: 13,
    textAlign: 'center',
  },
});
