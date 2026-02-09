/**
 * Sentry Server Configuration
 * Initializes Sentry for server-side error tracking
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: false,
  environment: process.env.NODE_ENV,
  beforeSend(event) {
    // Allow payment-related errors through even if they're connection errors —
    // a dropped DB connection after a Stripe charge is critical to know about.
    const isPaymentRelated = event.tags?.component === 'api'
      && event.tags?.action === 'direct_payment';
    if (isPaymentRelated) return event;

    // Suppress routine connection noise from non-critical paths
    const message = event.exception?.values?.[0]?.value || '';
    if (/ECONNRESET|ETIMEDOUT|ECONNREFUSED/.test(message)) {
      return null;
    }

    return event;
  },
});
