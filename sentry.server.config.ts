/**
 * Sentry Server Configuration
 * Initializes Sentry for server-side error tracking
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  environment: process.env.NODE_ENV,

  // Ignore common non-actionable errors
  ignoreErrors: [
    // Network timeout errors that are expected
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
  ],

  beforeSend(event, hint) {
    // Add custom logic here if needed
    // For example, scrub sensitive data
    return event;
  },
});
