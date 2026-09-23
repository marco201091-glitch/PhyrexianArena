import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/constants/theme';

export function ReportRing({ value, label }: { value: number; label: string }) {
  const rate = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const circumference = 2 * Math.PI * 43;
  return <View style={styles.root} accessible accessibilityLabel={`${label}: ${rate}%`}>
    <Svg width={104} height={104} style={StyleSheet.absoluteFill}>
      <Circle cx={52} cy={52} r={43} stroke="#28363a" strokeWidth={8} fill="none" />
      <Circle cx={52} cy={52} r={43} stroke="#86efac" strokeWidth={8} fill="none" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - rate / 100)} rotation={-90} origin="52,52" />
    </Svg>
    <Text style={styles.value}>{rate}%</Text><Text style={styles.label}>{label}</Text>
  </View>;
}
const styles = StyleSheet.create({ root: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center' }, value: { color: colors.foreground, fontSize: 22, fontWeight: '900' }, label: { color: colors.muted, fontSize: 11, maxWidth: 76, textAlign: 'center' } });
