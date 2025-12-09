# Sentry Error Monitoring Setup

This project uses Sentry for comprehensive error tracking and monitoring across the entire application.

## Overview

Sentry is integrated system-wide to automatically capture and track:
- Unhandled exceptions in both client and server code
- Errors logged through our structured logger
- React component errors via error boundaries
- Performance monitoring and tracing
- User session replays for debugging

## Quick Start

### 1. Create a Sentry Account

1. Go to [sentry.io](https://sentry.io) and create an account
2. Create a new project and select "Next.js" as the platform
3. Copy your DSN (Data Source Name) - it looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Sentry Error Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id

# Sentry Organization and Project (for source map uploads)
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=your-project-slug

# Sentry Auth Token (for uploading source maps during builds)
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

**Getting your values:**
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`: Found in Sentry → Settings → Projects → [Your Project] → Client Keys (DSN)
- `SENTRY_ORG`: Found in your Sentry URL: `https://sentry.io/organizations/YOUR-ORG-SLUG/`
- `SENTRY_PROJECT`: Found in Sentry → Settings → Projects → [Your Project] → General Settings
- `SENTRY_AUTH_TOKEN`: Create at Sentry → Settings → Account → API → Auth Tokens
  - Required scopes: `project:releases`, `org:read`

### 3. Test the Integration

Run the development server:

```bash
pnpm dev
```

The application should start without errors. Sentry will automatically initialize on both client and server.

## Architecture

### Configuration Files

- **`instrumentation.ts`**: Next.js 15 server instrumentation (loads server/edge configs, handles errors)
- **`instrumentation-client.ts`**: Client-side instrumentation with session replay and navigation tracking
- **`sentry.server.config.ts`**: Server-side initialization for API routes
- **`sentry.edge.config.ts`**: Edge runtime initialization for middleware
- **`next.config.ts`**: Wraps Next.js config with Sentry's build-time plugin

The `instrumentation.ts` file loads the appropriate Sentry configuration based on the runtime (Node.js server or Edge) and exports an `onRequestError` hook to capture errors from nested React Server Components. The `instrumentation-client.ts` file initializes Sentry in the browser and exports an `onRouterTransitionStart` hook to track page navigations.

### Logging Integration

The project's structured loggers automatically integrate with Sentry:

**Server-side (API routes, server components):**
```typescript
import { logger } from "@/lib/logger";

logger.error({ error, userId, action }, "Failed to process payment");
// Automatically sent to Sentry with full context
```

**Client-side (React components):**
```typescript
import { logger } from "@/lib/client-logger";

logger.error({ error, componentName }, "Failed to load data");
// Automatically sent to Sentry with full context
```

### Error Boundaries

Two error boundaries catch React errors:

- **`src/app/global-error.tsx`**: Catches errors in the root layout
- **`src/app/error.tsx`**: Catches errors in page components

Both automatically send errors to Sentry with user-friendly error pages.

## Usage Examples

### Manual Error Capture

```typescript
import * as Sentry from "@sentry/nextjs";

try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: "checkout", action: "process_payment" },
    extra: { userId, amount, paymentMethod },
  });
  throw error;
}
```

### Adding Breadcrumbs

```typescript
Sentry.addBreadcrumb({
  category: "user.action",
  message: "User clicked checkout button",
  level: "info",
  data: { cartTotal, itemCount },
});
```

### Performance Monitoring

```typescript
const transaction = Sentry.startTransaction({
  op: "stripe.checkout",
  name: "Process Stripe Payment",
});

try {
  const result = await processPayment();
  transaction.setStatus("ok");
} catch (error) {
  transaction.setStatus("error");
  throw error;
} finally {
  transaction.finish();
}
```

### Child Loggers with Context

```typescript
// Server-side
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const requestLogger = logger.child({
    requestId: crypto.randomUUID(),
    endpoint: "/api/checkout"
  });

  requestLogger.info({}, "Processing checkout request");
  // All logs from this logger include requestId and endpoint
}
```

## Features

### Session Replay

Sentry captures video-like replays of user sessions when errors occur:
- **Production**: 10% of sessions, 100% of sessions with errors
- **Development**: 100% of all sessions
- Privacy: All text and media are masked by default

### Source Maps

The build process automatically uploads source maps to Sentry:
- Enabled in production builds
- Maps minified code back to original TypeScript
- Source maps are hidden from client bundles
- Requires `SENTRY_AUTH_TOKEN` to be set

### Ad-blocker Bypass

Requests to Sentry are tunneled through `/monitoring` to bypass ad-blockers and ensure error tracking works for all users.

### Automatic Instrumentation

The following are automatically tracked:
- All unhandled exceptions
- All console errors
- Failed API requests
- React component errors
- Performance metrics
- Vercel Cron Monitor jobs (if deployed to Vercel)

## Environment-Specific Behavior

### Development
- Pretty console output with emojis
- 100% trace sampling
- 100% session replay
- All errors sent to Sentry

### Production
- JSON structured logging
- 10% trace sampling
- 10% session replay, 100% on error
- Filtered errors (ignores browser extensions, etc.)

## Debugging

### Verify Sentry is Working

1. Check the browser console for initialization messages
2. Trigger a test error:
   ```typescript
   throw new Error("Test Sentry Integration");
   ```
3. Check your Sentry dashboard for the error

### Common Issues

**"Missing DSN" error:**
- Ensure `NEXT_PUBLIC_SENTRY_DSN` is set in `.env.local`
- Restart the dev server after adding environment variables

**Source maps not uploading:**
- Verify `SENTRY_AUTH_TOKEN` is set
- Check the auth token has `project:releases` scope
- Ensure `SENTRY_ORG` and `SENTRY_PROJECT` match your Sentry settings

**Errors not appearing in Sentry:**
- Check environment variables are correct
- Verify the DSN is valid
- Check browser network tab for failed requests to Sentry
- Ensure you're testing with production build: `pnpm build && pnpm start`

## Best Practices

1. **Always use the logger** instead of `console.log` for errors
2. **Include context** in all log messages (user ID, action, etc.)
3. **Use child loggers** for request handlers to maintain context
4. **Tag errors** with meaningful categories for filtering in Sentry
5. **Don't log sensitive data** (passwords, tokens, credit cards)
6. **Use appropriate log levels**: debug, info, warn, error

## Security Notes

- Never commit `.env.local` files
- Keep `SENTRY_AUTH_TOKEN` secure
- Sentry auth token only needs `project:releases` and `org:read` scopes
- All text and media in session replays are masked by default
- Before production, review Sentry's data scrubbing settings

## Support

For issues or questions:
- Sentry Documentation: [docs.sentry.io](https://docs.sentry.io)
- Next.js Integration Guide: [docs.sentry.io/platforms/javascript/guides/nextjs](https://docs.sentry.io/platforms/javascript/guides/nextjs)
- GitHub Issues: Open an issue in this repository
