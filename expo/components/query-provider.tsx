import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 2,
        networkMode: 'online',
      },
      mutations: { retry: 0, networkMode: 'online' },
    },
  }));

  useEffect(() => onlineManager.setEventListener((setOnline) => {
    const subscription = NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected));
    });
    return subscription;
  }), []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
