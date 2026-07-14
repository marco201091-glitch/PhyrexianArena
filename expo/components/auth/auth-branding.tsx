import { StyleSheet, View } from 'react-native';
import { ManaLogo } from '@/components/ui/mana-logo';
import { useLanguage } from '@/contexts/language-context';

export function AuthBranding() {
  const { copy } = useLanguage();

  return (
    <View style={styles.root}>
      <ManaLogo
        size="xl"
        showText
        layout="stacked"
        subtitle={copy('appSubtitle')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: -16,
  },
});