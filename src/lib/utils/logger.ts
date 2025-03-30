/**
 * Logger utility for the mobile-use application
 * Provides consistent logging with namespaces across the application
 */

type LogLevel = 'debug' | 'info' | 'warning' | 'error';

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  group: (label: string) => void;
  groupEnd: () => void;
}

/**
 * Creates a logger with a specific namespace
 * @param namespace The namespace for the logger
 * @returns A logger instance
 */
const createLogger = (namespace: string): Logger => {
  const prefix = `[${namespace}]`;

  return {
    debug: (...args: unknown[]) => console.debug(prefix, ...args),
    info: (...args: unknown[]) => console.info(prefix, ...args),
    warn: (...args: unknown[]) => console.warn(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args),
    group: (label: string) => console.group(`${prefix} ${label}`),
    groupEnd: () => console.groupEnd(),
  };
};

// Create default logger
const logger = createLogger('mobile-use');

export type { Logger, LogLevel };
export { createLogger, logger };
