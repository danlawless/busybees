/**
 * Client-Side Logger with Sentry Integration
 * Provides consistent logging for browser-side code with automatic error tracking
 */

"use client";

import * as Sentry from "@sentry/nextjs";

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class ClientLogger {
  private log(level: LogLevel, context: LogContext, message: string) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...context,
    };

    // Use pretty console output in the browser
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    }[level];

    console[level === 'debug' ? 'log' : level](
      `${emoji} [${level.toUpperCase()}]`,
      message,
      context
    );

    // Send errors and warnings to Sentry
    if (level === 'error' || level === 'warn') {
      const sentryLevel = level === 'error' ? 'error' : 'warning';

      // Add breadcrumb for context
      Sentry.addBreadcrumb({
        category: 'log',
        message,
        level: sentryLevel,
        data: context,
      });

      // If there's an error object in the context, capture it as an exception
      if (context.error && context.error instanceof Error) {
        Sentry.captureException(context.error, {
          level: sentryLevel,
          tags: {
            logMessage: message,
          },
          extra: {
            ...context,
            error: undefined, // Remove error from extra to avoid duplication
          },
        });
      } else {
        // Otherwise capture as a message
        Sentry.captureMessage(message, {
          level: sentryLevel,
          extra: context,
        });
      }
    }
  }

  debug(context: LogContext, message: string) {
    this.log('debug', context, message);
  }

  info(context: LogContext, message: string) {
    this.log('info', context, message);
  }

  warn(context: LogContext, message: string) {
    this.log('warn', context, message);
  }

  error(context: LogContext, message: string) {
    this.log('error', context, message);
  }

  /**
   * Create a child logger with persistent context
   * Useful for component logging where you want to include component name, user ID, etc.
   */
  child(persistentContext: LogContext): ClientLogger {
    const childLogger = new ClientLogger();
    const originalLog = childLogger.log.bind(childLogger);

    childLogger.log = (level: LogLevel, context: LogContext, message: string) => {
      originalLog(level, { ...persistentContext, ...context }, message);
    };

    return childLogger;
  }
}

export const logger = new ClientLogger();
