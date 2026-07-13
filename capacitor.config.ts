import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.phyrexianarena.app',
  appName: 'Phyrexian Arena',
  webDir: 'mobile/www',
  android: {
    path: 'mobile/android',
    appendUserAgent: 'PhyrexianArenaNative/1.0',
  },
  server: {
    url: 'https://phyrexian-arena.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1200,
      backgroundColor: '#0a0a0f',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0f',
    },
  },
};

export default config;