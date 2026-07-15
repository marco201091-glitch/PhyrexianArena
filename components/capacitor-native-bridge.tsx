'use client';

import { useEffect } from 'react';
import { isNativeApp } from '@/lib/capacitor';

export function CapacitorNativeBridge() {
  useEffect(() => {
    if (!isNativeApp()) return;

    let removeBackListener: (() => void) | undefined;
    let disposed = false;

    void (async () => {
      try {
        const [{ App }, { StatusBar, Style, Animation }] = await Promise.all([
          import('@capacitor/app'),
          import('@capacitor/status-bar'),
        ]);

        if (disposed) return;

        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0a0a0f' });
        await StatusBar.hide({ animation: Animation.None });

        const listener = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
            return;
          }

          void App.minimizeApp();
        });

        removeBackListener = () => {
          void listener.remove();
        };
      } catch (error) {
        console.warn('Capacitor native bridge unavailable', error);
      }
    })();

    return () => {
      disposed = true;
      removeBackListener?.();
    };
  }, []);

  return null;
}
