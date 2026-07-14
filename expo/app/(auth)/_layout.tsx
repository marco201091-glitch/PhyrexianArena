import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.black },
        headerTintColor: colors.foreground,
        contentStyle: { backgroundColor: colors.black },
      }}
    />
  );
}