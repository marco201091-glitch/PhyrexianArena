import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { AvatarVersionProvider } from '@/contexts/avatar-version-context';
import { LanguageProvider } from '@/contexts/language-context';
import { ToastProvider } from '@/contexts/toast-context';
import { AccessLogger } from '@/components/access-logger';
import { AppAlertHost } from '@/components/ui/app-alert-host';
import { ImageCacheWarmer } from '@/components/deck/image-cache-warmer';
import { colors } from '@/constants/theme';
import { Sentry } from '@/lib/sentry';
import { QueryProvider } from '@/components/query-provider';
import { AppErrorBoundary } from '@/components/app-error-boundary';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inJoinRoute = segments[0] === 'join';
    const inArenaRoute = segments[0] === 'arena';
    const inLegalRoute = segments[0] === 'legal';
    const inCounterRoute = String(segments[0]) === 'counter';
    const isPublicRoute = inAuthGroup || inJoinRoute || inArenaRoute || inLegalRoute || inCounterRoute;

    if (!user && !isPublicRoute) {
      router.replace({
        pathname: '/(auth)/login',
        params: pathname && pathname !== '/' ? { redirect: pathname } : undefined,
      });
    }
  }, [user, loading, segments, pathname, router]);

  const inAuthGroup = segments[0] === '(auth)';
  const inJoinRoute = segments[0] === 'join';
  const inArenaRoute = segments[0] === 'arena';
  const inLegalRoute = segments[0] === 'legal';
  const inCounterRoute = String(segments[0]) === 'counter';
  const isPublicRoute = inAuthGroup || inJoinRoute || inArenaRoute || inLegalRoute || inCounterRoute;

  if (loading || (!user && !isPublicRoute)) {
    return <View style={styles.authLoadingSurface} />;
  }

  return <>{children}</>;
}

function RootLayout() {
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.black);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <KeyboardProvider>
      <QueryProvider>
      <LanguageProvider>
        <AuthProvider>
          <AvatarVersionProvider>
          <ToastProvider>
          <StatusBar style="light" />
          <AppErrorBoundary>
          <AuthGate>
            <AccessLogger />
            <ImageCacheWarmer />
            <AppAlertHost />
            <Stack
            screenOptions={{
              headerShown: false,
              headerTransparent: true,
              headerTitleStyle: { color: colors.foreground, fontWeight: '700' },
              headerTintColor: colors.foreground,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="join/[code]" />
            <Stack.Screen name="arena/[code]" />
            <Stack.Screen name="legal/[slug]" />
            <Stack.Screen name="counter" />
          </Stack>
          </AuthGate>
          </AppErrorBoundary>
          </ToastProvider>
          </AvatarVersionProvider>
        </AuthProvider>
      </LanguageProvider>
      </QueryProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  authLoadingSurface: {
    flex: 1,
    backgroundColor: colors.black,
  },
});
