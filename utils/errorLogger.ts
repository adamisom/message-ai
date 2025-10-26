/**
 * Centralized Error Logger
 * Logs errors with context for debugging, stores last 100 in AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ErrorContext {
  userId?: string;
  conversationId?: string;
  feature?: string;
  action?: string;
  metadata?: Record<string, any>;
}

interface ErrorLog {
  timestamp: string;
  name: string;
  message: string;
  stack?: string;
  context?: ErrorContext;
}

const ERROR_LOG_KEY = '@messageai:error_logs';
const MAX_LOGS = 100;

export class ErrorLogger {
  /**
   * Log an error with context
   */
  static async log(error: Error, context?: ErrorContext) {
    const timestamp = new Date().toISOString();
    const errorDetails: ErrorLog = {
      timestamp,
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
    };
    
    // Always log to console in development
    if (__DEV__) {
      console.error('[ErrorLogger]', errorDetails);
    }
    
    // Store locally for debugging (async, don't block)
    this.storeLocally(errorDetails).catch(err => {
      console.warn('[ErrorLogger] Failed to store error:', err);
    });
    
    // Future: Send to monitoring service
    // Sentry.captureException(error, { extra: errorDetails });
  }
  
  /**
   * Store error in AsyncStorage (last 100 errors)
   */
  private static async storeLocally(errorDetails: ErrorLog) {
    try {
      // Get existing logs
      const existing = await this.getRecentErrors();
      
      // Add new log at beginning
      const updated = [errorDetails, ...existing];
      
      // Keep only last 100
      const trimmed = updated.slice(0, MAX_LOGS);
      
      // Save back to storage
      await AsyncStorage.setItem(ERROR_LOG_KEY, JSON.stringify(trimmed));
    } catch (error) {
      // Don't throw - logging errors shouldn't break the app
      console.warn('[ErrorLogger] Storage failed:', error);
    }
  }
  
  /**
   * Retrieve recent errors from AsyncStorage
   */
  static async getRecentErrors(): Promise<ErrorLog[]> {
    try {
      const stored = await AsyncStorage.getItem(ERROR_LOG_KEY);
      if (!stored) return [];
      
      return JSON.parse(stored) as ErrorLog[];
    } catch (error) {
      console.warn('[ErrorLogger] Failed to retrieve logs:', error);
      return [];
    }
  }
  
  /**
   * Clear all stored error logs
   */
  static async clearLogs() {
    try {
      await AsyncStorage.removeItem(ERROR_LOG_KEY);
      console.log('[ErrorLogger] Logs cleared');
    } catch (error) {
      console.warn('[ErrorLogger] Failed to clear logs:', error);
    }
  }
  
  /**
   * Export logs as JSON string (for support tickets)
   */
  static async exportLogs(): Promise<string> {
    const logs = await this.getRecentErrors();
    return JSON.stringify(logs, null, 2);
  }
}

