import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { radii } from '@/constants/theme';

export function QrCode({
  value,
  size = 240,
  label,
}: {
  value: string;
  size?: number;
  label: string;
}) {
  const quietZone = Math.max(12, Math.round(size * 0.06));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[styles.frame, { width: size, height: size }]}
      testID="local-qr-code"
    >
      <QRCode
        value={value}
        size={size - quietZone * 2}
        quietZone={quietZone}
        color="#09090b"
        backgroundColor="#ffffff"
        ecl="M"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: '#ffffff',
  },
});
