/**
 * Unit tests for Cloud Functions Wrapper
 */

import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import {
  callCloudFunction,
  callCloudFunctionWithTimeout,
  callCloudFunctionSafe,
} from '../cloudFunctions';

// Mock Firebase
jest.mock('firebase/functions');
jest.mock('../../firebase.config', () => ({
  functions: {},
}));

describe('cloudFunctions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error in tests since we're intentionally testing error cases
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('callCloudFunction', () => {
    it('should call Cloud Function and return data', async () => {
      const mockResult: HttpsCallableResult = {
        data: { success: true, conversationId: 'conv-123' },
      };
      const mockFn = jest.fn().mockResolvedValue(mockResult);
      (httpsCallable as jest.Mock).mockReturnValue(mockFn);

      const result = await callCloudFunction('createConversation', { name: 'Test' });

      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'createConversation');
      expect(mockFn).toHaveBeenCalledWith({ name: 'Test' });
      expect(result).toEqual({ success: true, conversationId: 'conv-123' });
    });

    it('should handle empty data parameter', async () => {
      const mockResult: HttpsCallableResult = { data: { status: 'ok' } };
      const mockFn = jest.fn().mockResolvedValue(mockResult);
      (httpsCallable as jest.Mock).mockReturnValue(mockFn);

      await callCloudFunction('someFunction');

      expect(mockFn).toHaveBeenCalledWith({});
    });

    it('should throw error with user-friendly message', async () => {
      const mockError = new Error('Permission denied');
      const mockFn = jest.fn().mockRejectedValue(mockError);
      (httpsCallable as jest.Mock).mockReturnValue(mockFn);

      await expect(callCloudFunction('protectedFunction')).rejects.toThrow('Permission denied');
    });

    it('should log error details to console', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockError = { code: 'permission-denied', message: 'Access denied' };
      const mockFn = jest.fn().mockRejectedValue(mockError);
      (httpsCallable as jest.Mock).mockReturnValue(mockFn);

      await expect(callCloudFunction('protectedFunction')).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[protectedFunction] Cloud Function error:',
        mockError
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[protectedFunction] Error code:',
        'permission-denied'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('callCloudFunctionWithTimeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return result before timeout', async () => {
      const mockResult: HttpsCallableResult = { data: { success: true } };
      const mockFn = jest.fn().mockResolvedValue(mockResult);
      (httpsCallable as jest.Mock).mockReturnValue(mockFn);

      const promise = callCloudFunctionWithTimeout('fastFunction', {}, 5000);
      jest.advanceTimersByTime(100);
      
      const result = await promise;
      expect(result).toEqual({ success: true });
    });

    it('should timeout if function takes too long', async () => {
      const mockFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );
      (httpsCallable as jest.Mock).mockReturnValue(mockFn);

      const promise = callCloudFunctionWithTimeout('slowFunction', {}, 1000);
      
      jest.advanceTimersByTime(1001);

      await expect(promise).rejects.toThrow('Request timeout');
    });
  });

  describe('callCloudFunctionSafe', () => {
    it('should return success object on success', async () => {
      const mockResult: HttpsCallableResult = { data: { userId: 'user-123' } };
      const mockFn = jest.fn().mockResolvedValue(mockResult);
      (httpsCallable as jest.Mock).mockReturnValue(mockFn);

      const result = await callCloudFunctionSafe('getUser', { id: '123' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ userId: 'user-123' });
      expect(result.error).toBeUndefined();
    });

    it('should return error object on failure', async () => {
      const mockError = new Error('User not found');
      const mockFn = jest.fn().mockRejectedValue(mockError);
      (httpsCallable as jest.Mock).mockReturnValue(mockFn);

      const result = await callCloudFunctionSafe('getUser', { id: '999' });

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBe('User not found');
    });

    it('should not throw errors (safe mode)', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Network error'));
      (httpsCallable as jest.Mock).mockReturnValue(mockFn);

      // Should not throw
      const result = await callCloudFunctionSafe('unreliableFunction');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });
});

