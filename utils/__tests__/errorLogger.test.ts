/**
 * Error Logger Tests
 * Tests error logging with AsyncStorage persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorLogger } from '../errorLogger';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('ErrorLogger', () => {
  // Mock __DEV__
  const originalDev = (global as any).__DEV__;
  
  beforeEach(() => {
    // Set __DEV__ for tests
    (global as any).__DEV__ = false;
    
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Suppress console logs during tests
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
    
    // Mock AsyncStorage to return empty array and resolve setItem by default
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    (global as any).__DEV__ = originalDev;
    jest.restoreAllMocks();
  });

  describe('log()', () => {
    it('should log error with context', async () => {
      const error = new Error('Test error');
      const context = {
        userId: 'user123',
        conversationId: 'conv456',
        action: 'send_message',
      };

      await ErrorLogger.log(error, context);
      
      // Wait for async storeLocally to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const [key, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      
      expect(key).toBe('@messageai:error_logs');
      const stored = JSON.parse(value);
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        name: 'Error',
        message: 'Test error',
        context,
      });
      expect(stored[0]).toHaveProperty('timestamp');
      expect(stored[0]).toHaveProperty('stack');
    });

    it('should log error without context', async () => {
      const error = new Error('Simple error');

      await ErrorLogger.log(error);
      await new Promise(resolve => setImmediate(resolve));

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const stored = JSON.parse(value);
      
      expect(stored[0].message).toBe('Simple error');
      expect(stored[0].context).toBeUndefined();
    });

    it('should log to console in development', async () => {
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = true;

      const error = new Error('Dev error');
      await ErrorLogger.log(error);

      expect(console.error).toHaveBeenCalledWith('[ErrorLogger]', expect.any(Object));

      (global as any).__DEV__ = originalDev;
    });

    it('should handle AsyncStorage failures gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage full'));
      
      const error = new Error('Test error');
      
      // Should not throw even though storage fails
      await expect(ErrorLogger.log(error)).resolves.not.toThrow();
      
      // Should attempt to save but fail silently
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('getRecentErrors()', () => {
    it('should retrieve stored errors', async () => {
      const mockLogs = [
        {
          timestamp: '2025-10-26T12:00:00Z',
          name: 'Error',
          message: 'Error 1',
          stack: 'stack trace',
        },
        {
          timestamp: '2025-10-26T12:01:00Z',
          name: 'Error',
          message: 'Error 2',
          stack: 'stack trace',
        },
      ];
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockLogs));

      const result = await ErrorLogger.getRecentErrors();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@messageai:error_logs');
      expect(result).toEqual(mockLogs);
    });

    it('should return empty array when no logs stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await ErrorLogger.getRecentErrors();

      expect(result).toEqual([]);
    });

    it('should handle corrupted data gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('invalid json{');

      const result = await ErrorLogger.getRecentErrors();

      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalled();
    });

    it('should handle AsyncStorage errors', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Read error'));

      const result = await ErrorLogger.getRecentErrors();

      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith(
        '[ErrorLogger] Failed to retrieve logs, clearing corrupted data:',
        expect.any(Error)
      );
    });
  });

  describe('Trimming to 100 logs', () => {
    it('should keep only last 100 errors', async () => {
      // Create 100 existing logs
      const existingLogs = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(2025, 9, 26, 10, i).toISOString(),
        name: 'Error',
        message: `Error ${i}`,
        stack: 'stack',
      }));

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existingLogs));

      // Add one more error (should trim oldest)
      const newError = new Error('Error 100');
      await ErrorLogger.log(newError);
      await new Promise(resolve => setImmediate(resolve));

      const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const stored = JSON.parse(value);

      expect(stored).toHaveLength(100); // Trimmed to 100
      expect(stored[0].message).toBe('Error 100'); // New error at beginning
      expect(stored[99].message).toBe('Error 98'); // 99th oldest kept (was at index 98, 0-indexed)
    });

    it('should handle fewer than 100 logs', async () => {
      const existingLogs = [
        {
          timestamp: '2025-10-26T12:00:00Z',
          name: 'Error',
          message: 'Old error',
          stack: 'stack',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existingLogs));

      const newError = new Error('New error');
      await ErrorLogger.log(newError);
      await new Promise(resolve => setImmediate(resolve));

      const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const stored = JSON.parse(value);

      expect(stored).toHaveLength(2); // Both kept
      expect(stored[0].message).toBe('New error');
      expect(stored[1].message).toBe('Old error');
    });
  });

  describe('clearLogs()', () => {
    it('should remove all logs from storage', async () => {
      await ErrorLogger.clearLogs();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@messageai:error_logs');
      expect(console.log).toHaveBeenCalledWith('[ErrorLogger] Logs cleared');
    });

    it('should handle removal errors gracefully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error('Remove error'));

      await ErrorLogger.clearLogs();

      expect(console.warn).toHaveBeenCalledWith(
        '[ErrorLogger] Failed to clear logs:',
        expect.any(Error)
      );
    });
  });

  describe('exportLogs()', () => {
    it('should export logs as formatted JSON string', async () => {
      const mockLogs = [
        {
          timestamp: '2025-10-26T12:00:00Z',
          name: 'Error',
          message: 'Test error',
          stack: 'stack trace',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockLogs));

      const result = await ErrorLogger.exportLogs();

      expect(result).toBe(JSON.stringify(mockLogs, null, 2));
    });

    it('should export empty array when no logs', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await ErrorLogger.exportLogs();

      expect(result).toBe(JSON.stringify([], null, 2));
    });
  });

  describe('Error Properties', () => {
    it('should capture error name correctly', async () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const error = new CustomError('Custom error message');
      await ErrorLogger.log(error);
      await new Promise(resolve => setImmediate(resolve));

      const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const stored = JSON.parse(value);

      expect(stored[0].name).toBe('CustomError');
    });

    it('should capture stack trace', async () => {
      const error = new Error('Error with stack');
      await ErrorLogger.log(error);
      await new Promise(resolve => setImmediate(resolve));

      const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const stored = JSON.parse(value);

      expect(stored[0].stack).toBeDefined();
      expect(typeof stored[0].stack).toBe('string');
    });

    it('should store timestamp in ISO format', async () => {
      const error = new Error('Test');
      await ErrorLogger.log(error);
      await new Promise(resolve => setImmediate(resolve));

      const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const stored = JSON.parse(value);

      expect(stored[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});

