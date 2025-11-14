/**
 * Structured Logger
 * Simple logger for consistent logging throughout the app
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private log(level: LogLevel, context: LogContext, message: string) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...context,
    };

    // In development, use pretty console output
    if (process.env.NODE_ENV === 'development') {
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
    } else {
      // In production, use JSON for structured logging
      console.log(JSON.stringify(logData));
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
}

export const logger = new Logger();

