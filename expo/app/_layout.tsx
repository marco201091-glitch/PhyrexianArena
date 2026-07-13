import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { AvatarVersionProvider } from '@/contexts/avatar-version-context';
import { LanguageProvider } from '@/contexts/language-context';
import { ToastProvider } from '@/contexts/toast-context';
import { AccessLogger } from '@/components/access-logger';
import { ImageCacheWarmer } from '@/components/deck/image-cache-warmer';
import { colors } from '@/constants/theme';

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
    const isPublicRoute = inAuthGroup || inJoinRoute || inArenaRoute || inLegalRoute;

    if (!user && !isPublicRoute) {
      router.replace({
        pathname: '/(auth)/login',
        params: pathname && pathname !== '/' ? { redirect: pathname } : undefined,
      });
    }
  }, [user, loading, segments, pathname, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
    void SystemUI.setBackgroundColorAsync(colors.black);
  }, []);

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <AvatarVersionProvider>
          <ToastProvider>
          <StatusBar style="light" translucent={Platform.OS === 'android'} />
          <AuthGate>
            <AccessLogger />
            <ImageCacheWarmer />
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
            <Stack.Screen name="table/[id]" />
          </Stack>
          </AuthGate>
          </ToastProvider>
          </AvatarVersionProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}