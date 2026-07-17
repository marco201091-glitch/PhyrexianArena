import { StyleSheet, View } from 'react-native';
import { ManaLogo } from '@/components/ui/mana-logo';
import { useLanguage } from '@/contexts/language-context';
import { t } from '@/lib/i18n/translations';

export function AuthBranding({ forceEnglish = false }: { forceEnglish?: boolean }) {
  const { copy } = useLanguage();

  return (
    <View style={styles.root}>
      <ManaLogo
        size="xl"
        showText
        layout="stacked"
        subtitle={forceEnglish ? t('en', 'appSubtitle') : copy('appSubtitle')}
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
