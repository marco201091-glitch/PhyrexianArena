import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { colors, spacing } from '@/constants/theme';

function Fallback({ resetErrorBoundary }: FallbackProps) {
  return <View style={styles.container}>
    <Text style={styles.title}>Qualcosa è andato storto</Text>
    <Text style={styles.body}>La schermata non è disponibile. Riprova.</Text>
    <Button label="Riprova" onPress={resetErrorBoundary} />
  </View>;
}

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary FallbackComponent={Fallback}>{children}</ErrorBoundary>;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.black },
  title: { color: colors.foreground, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  body: { color: colors.muted, fontSize: 14, textAlign: 'center' },
});
