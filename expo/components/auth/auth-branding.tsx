import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { ManaLogo } from '@/components/ui/mana-logo';
import { useLanguage } from '@/contexts/language-context';

export function AuthBranding() {
  const { height, width } = useWindowDimensions();
  const { copy } = useLanguage();

  return (
    <View style={styles.root}>
      <ManaLogo
        size={height < 740 || width < 400 ? "md" : "lg"}
        showText
        layout="stacked"
        title={copy('appName')}
        subtitle={copy('appSubtitle')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 0,
  },
});
