import * as Sentry from '@sentry/react-native';

const enabled = process.env.EXPO_PUBLIC_SENTRY_ENABLED === 'true' && Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN);

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: enabled ? 0.1 : 0,
  sendDefaultPii: false,
});

export { Sentry };
