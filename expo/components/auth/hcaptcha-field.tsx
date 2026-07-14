import Hcaptcha from '@hcaptcha/react-native-hcaptcha/Hcaptcha';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Modal } from '@/components/ui/modal';
import { getHcaptchaSiteKey } from '@/lib/env';
import { colors, spacing } from '@/constants/theme';

const HCAPTCHA_BASE_URL = 'https://hcaptcha.com';

type CaptchaMessageEvent = {
  nativeEvent: { data: string; description?: string };
  success?: boolean;
  reset?: () => void;
  markUsed?: () => void;
};

type HCaptchaFieldProps = {
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

export function HCaptchaField({
  onVerify,
  onExpire,
  onError,
  resetSignal = 0,
  unavailableLabel,
  verifyLabel,
  verifiedLabel,
  errorLabel,
  languageCode = 'en',
}: HCaptchaFieldProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [verified, setVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const siteKey = getHcaptchaSiteKey();
  const challengeHeight = Math.min(windowHeight * 0.72, 560);

  useEffect(() => {
    setVerified(false);
    setErrorMessage(null);
    setVisible(false);
    setSessionKey((value) => value + 1);
  }, [resetSignal]);

  const closeCaptcha = useCallback(() => {
    setVisible(false);
  }, []);

  const handleMessage = useCallback((event: CaptchaMessageEvent) => {
    const data = event?.nativeEvent?.data;
    if (!data) return;

    if (data === 'open') {
      setErrorMessage(null);
      return;
    }

    if (data === 'challenge-closed' || data === 'cancel') {
      closeCaptcha();
      onExpire();
      return;
    }

    if (event.success && data.length > 20) {
      closeCaptcha();
      event.markUsed?.();
      setVerified(true);
      setErrorMessage(null);
      onVerify(data);
      return;
    }

    closeCaptcha();
    setVerified(false);
    setErrorMessage(errorLabel);
    onExpire();
    onError?.();
    event.reset?.();
  }, [closeCaptcha, errorLabel, onError, onExpire, onVerify]);

  const openCaptcha = useCallback(() => {
    setErrorMessage(null);
    setSessionKey((value) => value + 1);
    setVisible(true);
  }, []);

  if (!siteKey) {
    return <Text style={styles.unavailable}>{unavailableLabel}</Text>;
  }

  return (
    <View style={styles.wrapper}>
      {verified ? (
        <Text style={styles.verified}>{verifiedLabel}</Text>
      ) : (
        <Pressable onPress={openCaptcha} accessibilityRole="button">
          <Text style={styles.link}>{verifyLabel}</Text>
        </Pressable>
      )}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <Modal
        visible={visible}
        onClose={() => {
          closeCaptcha();
          onExpire();
        }}
        scroll={false}
      >
        <Text style={styles.modalTitle}>{verifyLabel}</Text>
        <View style={[styles.challengeHost, { height: challengeHeight }]}>
          <Hcaptcha
            key={`${resetSignal}-${sessionKey}`}
            siteKey={siteKey}
            url={HCAPTCHA_BASE_URL}
            size="invisible"
            theme="dark"
            languageCode={languageCode}
            showLoading
            closableLoading
            loadingIndicatorColor={colors.primary}
            backgroundColor="rgba(10, 10, 15, 0.96)"
            onMessage={handleMessage}
            style={styles.challenge}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'flex-start',
    gap: spacing.xs + 2,
  },
  link: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  verified: {
    color: colors.successBright,
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    color: colors.destructive,
    fontSize: 12,
    lineHeight: 16,
  },
  unavailable: {
    color: colors.muted,
    fontSize: 13,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  challengeHost: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.cardInset,
  },
  challenge: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
});