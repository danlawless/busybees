/**
 * Client-Side Instrumentation
 * Initializes Sentry for client-side error tracking
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  environment: process.env.NODE_ENV,
  ignoreErrors: [
    'top.GLOBALS',
    'chrome-extension://',
    'moz-extension://',
    'NetworkError',
    'Failed to fetch',
    'ResizeObserver loop limit exceeded',
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
