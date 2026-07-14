import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ManaLogo } from '@/components/ui/mana-logo';
import { colors } from '@/constants/theme';
import { layout } from '@/lib/layout';

type LoaderProps = {
  label?: string;
};

export function Loader({ label }: LoaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <ManaLogo size="lg" />
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? (
        <Text style={styles.label} maxFontSizeMultiplier={layout.maxFontSizeMultiplier}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: colors.background,
  },
  label: {
    color: colors.muted,
    fontSize: 15,
  },
});