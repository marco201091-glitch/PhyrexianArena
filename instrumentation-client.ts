import * as Sentry from '@sentry/nextjs';

const enabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true' && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: enabled ? 0.1 : 0,
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
