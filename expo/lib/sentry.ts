import * as Sentry from '@sentry/react-native';

export const sentryEnabled =
  process.env.EXPO_PUBLIC_SENTRY_ENABLED === 'true'
  && Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN);

if (sentryEnabled) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enabled: true,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

export { Sentry };
