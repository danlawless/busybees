/**
 * Global Error Boundary
 * Catches errors in the root layout and sends them to Sentry
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errortsx
 */

"use client";

import { useEffect } from "react";
import { logger } from "@/lib/client-logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    logger.error({ error, digest: error.digest }, "Global error occurred");
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>
            Something went wrong!
          </h1>
          <p style={{ marginBottom: '24px', color: '#666' }}>
            We apologize for the inconvenience. Our team has been notified.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f5d565',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
