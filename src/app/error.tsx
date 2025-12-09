/**
 * Error Boundary
 * Catches errors in page components and sends them to Sentry
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */

"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { logger } from "@/lib/client-logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    logger.error({ error, digest: error.digest }, "Page error occurred");
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        maxWidth: '500px',
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>
          Oops! Something went wrong
        </h1>
        <p style={{ marginBottom: '24px', color: '#666' }}>
          We apologize for the inconvenience. Our team has been notified and is working on a fix.
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
            fontWeight: 'bold',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
