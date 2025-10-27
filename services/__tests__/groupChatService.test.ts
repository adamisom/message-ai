/**
 * Unit tests for group chat service (client-side)
 * Tests invitation acceptance, decline, and spam reporting functions
 */

import { httpsCallable } from 'firebase/functions';
import { acceptGroupChatInvitation, declineGroupChatInvitation, reportGroupChatInvitationSpam } from '../groupChatService';

// Mock Firebase functions
jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));

jest.mock('../../firebase.config', () => ({
  functions: {},
}));

const mockHttpsCallable = httpsCallable as jest.MockedFunction<typeof httpsCallable>;

describe('groupChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('acceptGroupChatInvitation', () => {
    it('should call Cloud Function with correct invitation ID', async () => {
      const mockCallable = jest.fn(() => Promise.resolve({ data: { success: true } }));
      mockHttpsCallable.mockReturnValue(mockCallable as any);

      await acceptGroupChatInvitation('inv123');

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'acceptGroupChatInvitation');
      expect(mockCallable).toHaveBeenCalledWith({ invitationId: 'inv123' });
    });

    it('should throw error if Cloud Function fails', async () => {
      const mockCallable = jest.fn(() => Promise.reject(new Error('Network error')));
      mockHttpsCallable.mockReturnValue(mockCallable as any);

      await expect(acceptGroupChatInvitation('inv123')).rejects.toThrow('Network error');
    });
  });

  describe('declineGroupChatInvitation', () => {
    it('should call Cloud Function with correct invitation ID', async () => {
      const mockCallable = jest.fn(() => Promise.resolve({ data: { success: true } }));
      mockHttpsCallable.mockReturnValue(mockCallable as any);

      await declineGroupChatInvitation('inv456');

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'declineGroupChatInvitation');
      expect(mockCallable).toHaveBeenCalledWith({ invitationId: 'inv456' });
    });

    it('should throw error if Cloud Function fails', async () => {
      const mockCallable = jest.fn(() => Promise.reject(new Error('Permission denied')));
      mockHttpsCallable.mockReturnValue(mockCallable as any);

      await expect(declineGroupChatInvitation('inv456')).rejects.toThrow('Permission denied');
    });
  });

  describe('reportGroupChatInvitationSpam', () => {
    it('should call Cloud Function with correct invitation ID', async () => {
      const mockCallable = jest.fn(() => Promise.resolve({ data: { success: true } }));
      mockHttpsCallable.mockReturnValue(mockCallable as any);

      await reportGroupChatInvitationSpam('inv789');

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'reportGroupChatInvitationSpam');
      expect(mockCallable).toHaveBeenCalledWith({ invitationId: 'inv789' });
    });

    it('should throw error if Cloud Function fails', async () => {
      const mockCallable = jest.fn(() => Promise.reject(new Error('Already reported')));
      mockHttpsCallable.mockReturnValue(mockCallable as any);

      await expect(reportGroupChatInvitationSpam('inv789')).rejects.toThrow('Already reported');
    });
  });
});

