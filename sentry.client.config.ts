/**
 * Sentry Client Configuration
 * Initializes Sentry for client-side error tracking
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  environment: process.env.NODE_ENV,

  // Ignore common non-actionable errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'chrome-extension://',
    'moz-extension://',
    // Random plugins/extensions
    'Can\'t find variable: _AutofillCallbackHandler',
    // Network errors that are expected
    'NetworkError',
    'Failed to fetch',
    // ResizeObserver loop errors (common and harmless)
    'ResizeObserver loop limit exceeded',
  ],

  beforeSend(event, hint) {
    // Filter out errors from browser extensions
    if (event.exception?.values?.[0]?.stacktrace?.frames) {
      const frames = event.exception.values[0].stacktrace.frames;
      if (frames.some(frame =>
        frame.filename?.includes('chrome-extension://') ||
        frame.filename?.includes('moz-extension://')
      )) {
        return null;
      }
    }

    return event;
  },
});
