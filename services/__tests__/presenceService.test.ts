/**
 * Unit tests for presence service
 * Tests user online/offline status tracking
 */

import { serverTimestamp, setDoc } from 'firebase/firestore';
import { setUserOffline, setUserOnline } from '../presenceService';

// Mock firebase/firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
}));

// Mock firebase config
jest.mock('../../firebase.config', () => ({
  db: {},
}));

describe('presenceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setUserOnline', () => {
    it('should call setDoc with isOnline: true', async () => {
      await setUserOnline('user123');

      expect(setDoc).toHaveBeenCalledWith(
        undefined, // mocked doc() returns undefined
        {
          isOnline: true,
          lastSeenAt: 'MOCK_TIMESTAMP',
        },
        { merge: true }
      );
    });

    it('should use merge: true to avoid overwriting existing fields', async () => {
      await setUserOnline('user456');

      const callArgs = (setDoc as jest.Mock).mock.calls[0];
      expect(callArgs[2]).toEqual({ merge: true });
    });

    it('should use serverTimestamp for lastSeenAt', async () => {
      await setUserOnline('user789');

      expect(serverTimestamp).toHaveBeenCalled();
      const callArgs = (setDoc as jest.Mock).mock.calls[0];
      expect(callArgs[1].lastSeenAt).toBe('MOCK_TIMESTAMP');
    });

    it('should handle errors gracefully', async () => {
      (setDoc as jest.Mock).mockRejectedValueOnce(new Error('Firestore error'));

      // Should not throw
      await expect(setUserOnline('user123')).resolves.not.toThrow();
    });

    it('should work with different user IDs', async () => {
      await setUserOnline('alice');
      await setUserOnline('bob');
      await setUserOnline('charlie123');

      expect(setDoc).toHaveBeenCalledTimes(3);
    });
  });

  describe('setUserOffline', () => {
    it('should call setDoc with isOnline: false', async () => {
      await setUserOffline('user123');

      expect(setDoc).toHaveBeenCalledWith(
        undefined,
        {
          isOnline: false,
          lastSeenAt: 'MOCK_TIMESTAMP',
        },
        { merge: true }
      );
    });

    it('should use merge: true to preserve existing data', async () => {
      await setUserOffline('user456');

      const callArgs = (setDoc as jest.Mock).mock.calls[0];
      expect(callArgs[2]).toEqual({ merge: true });
    });

    it('should update lastSeenAt when going offline', async () => {
      await setUserOffline('user789');

      expect(serverTimestamp).toHaveBeenCalled();
      const callArgs = (setDoc as jest.Mock).mock.calls[0];
      expect(callArgs[1].lastSeenAt).toBe('MOCK_TIMESTAMP');
    });

    it('should handle errors gracefully', async () => {
      (setDoc as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(setUserOffline('user123')).resolves.not.toThrow();
    });
  });

  describe('online/offline transitions', () => {
    it('should handle rapid online/offline transitions', async () => {
      await setUserOnline('user123');
      await setUserOffline('user123');
      await setUserOnline('user123');

      expect(setDoc).toHaveBeenCalledTimes(3);
      
      // First call: online
      expect((setDoc as jest.Mock).mock.calls[0][1].isOnline).toBe(true);
      // Second call: offline
      expect((setDoc as jest.Mock).mock.calls[1][1].isOnline).toBe(false);
      // Third call: online
      expect((setDoc as jest.Mock).mock.calls[2][1].isOnline).toBe(true);
    });

    it('should update timestamp on each state change', async () => {
      await setUserOnline('user123');
      await setUserOffline('user123');

      expect(serverTimestamp).toHaveBeenCalledTimes(2);
    });
  });
});

