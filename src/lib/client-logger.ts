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

    if (level === 'error' || level === 'warn') {
      const sentryLevel = level === 'error' ? 'error' : 'warning';

      Sentry.addBreadcrumb({
        category: 'log',
        message,
        level: sentryLevel,
        data: context,
      });

      if (context.error && context.error instanceof Error) {
        Sentry.captureException(context.error, {
          level: sentryLevel,
          tags: { logMessage: message },
          extra: { ...context, error: undefined },
        });
      } else {
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
