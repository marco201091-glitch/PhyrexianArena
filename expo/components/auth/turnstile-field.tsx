import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Modal } from '@/components/ui/modal';
import { getApiBaseUrl, getTurnstileSiteKey } from '@/lib/env';
import { colors, spacing } from '@/constants/theme';

type TurnstileFieldProps = {
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError?: () => void;
  resetSignal?: number;
  unavailableLabel: string;
  verifyLabel: string;
  verifiedLabel: string;
  errorLabel: string;
  languageCode?: string;
};

export function TurnstileField({ onVerify, onExpire, onError, resetSignal = 0, unavailableLabel, verifyLabel, verifiedLabel, errorLabel }: TurnstileFieldProps) {
  const { height } = useWindowDimensions();
  const siteKey = getTurnstileSiteKey();
  const [visible, setVisible] = useState(false);
  const [verified, setVerified] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const source = useMemo(() => ({ uri: `${getApiBaseUrl()}/auth/turnstile` }), []);

  useEffect(() => { setVerified(false); setErrorMessage(null); setVisible(false); setSessionKey((value) => value + 1); }, [resetSignal]);
  const close = useCallback(() => setVisible(false), []);
  const open = useCallback(() => { setErrorMessage(null); setSessionKey((value) => value + 1); setVisible(true); }, []);
  if (!siteKey) return <Text style={styles.unavailable}>{unavailableLabel}</Text>;

  return <View style={styles.wrapper}>
    {verified ? <Text style={styles.verified}>✓ {verifiedLabel}</Text> : <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={verifyLabel} style={styles.button}><Text style={styles.buttonText}>🛡 {verifyLabel}</Text><Text style={styles.buttonHint}>Richiesto per continuare</Text></Pressable>}
    {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    <Modal visible={visible} onClose={() => { close(); onExpire(); }} scroll={false}>
      <Text style={styles.modalTitle}>{verifyLabel}</Text>
      <View style={[styles.challengeHost, { height: Math.min(height * 0.48, 360) }]}>
        <WebView key={`${resetSignal}-${sessionKey}`} source={source} originWhitelist={['https://*']} javaScriptEnabled domStorageEnabled thirdPartyCookiesEnabled sharedCookiesEnabled onMessage={(event) => { try { const message = JSON.parse(event.nativeEvent.data) as { type: string; token?: string }; if (message.type === 'token' && message.token) { setVerified(true); setErrorMessage(null); close(); onVerify(message.token); } else if (message.type === 'expired') { close(); onExpire(); } else if (message.type === 'error') { close(); setErrorMessage(errorLabel); onExpire(); onError?.(); } } catch { setErrorMessage(errorLabel); onError?.(); } }} />
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'stretch', gap: spacing.xs + 2 },
  button: { minHeight: 62, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: 12, backgroundColor: 'rgba(139, 92, 246, 0.16)', paddingHorizontal: spacing.md },
  buttonText: { color: colors.primaryLight, fontSize: 17, fontWeight: '800' },
  buttonHint: { color: colors.muted, fontSize: 12, marginTop: 3 },
  verified: { color: colors.successBright, fontSize: 16, fontWeight: '700', paddingVertical: spacing.sm },
  error: { color: colors.destructive, fontSize: 12, lineHeight: 16 },
  unavailable: { color: colors.muted, fontSize: 13 },
  modalTitle: { color: colors.foreground, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  challengeHost: { width: '100%', overflow: 'hidden', borderRadius: 12, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.cardInset },
});
