/**
 * Centralized Logging Service
 * 
 * Provides environment-aware logging that only outputs in development mode.
 * Helps keep production builds clean and reduces console noise.
 * 
 * Usage:
 * - Import logger from this file instead of using console.log directly
 * - Use logger.log(), logger.warn(), logger.error() instead of console methods
 * - In production (__DEV__ === false), log() and warn() are silent, error() still outputs
 */

// Determine if we're in development mode
// __DEV__ is a global constant provided by React Native / Metro bundler
// In tests, default to true
const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : true;

/**
 * Environment-aware logger
 * - In development: all methods output to console
 * - In production: only error() outputs, log() and warn() are silent
 */
export const logger = {
  /**
   * Log informational messages (development only)
   * @param args Arguments to log
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log warning messages (development only)
   * @param args Arguments to log
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Log error messages (always output, even in production)
   * @param args Arguments to log
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Log debug messages with a tag (development only)
   * Useful for adding context to logs
   * @param tag Tag to prefix the log with
   * @param args Arguments to log
   */
  debug: (tag: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`[DEBUG:${tag}]`, ...args);
    }
  },

  /**
   * Log info messages with a tag (development only)
   * @param tag Tag to prefix the log with
   * @param args Arguments to log
   */
  info: (tag: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`[INFO:${tag}]`, ...args);
    }
  },
};

/**
 * Create a scoped logger with a specific tag
 * Useful for creating module-specific loggers
 * 
 * @param tag Tag to prefix all logs with
 * @returns Scoped logger instance
 * 
 * @example
 * const log = createLogger('ChatScreen');
 * log.info('Message sent'); // Output: [INFO:ChatScreen] Message sent
 */
export function createLogger(tag: string) {
  return {
    log: (...args: any[]) => logger.log(`[${tag}]`, ...args),
    warn: (...args: any[]) => logger.warn(`[${tag}]`, ...args),
    error: (...args: any[]) => logger.error(`[${tag}]`, ...args),
    debug: (...args: any[]) => logger.debug(tag, ...args),
    info: (...args: any[]) => logger.info(tag, ...args),
  };
}

export default logger;

