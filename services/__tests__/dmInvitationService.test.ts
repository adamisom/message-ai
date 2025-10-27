/**
 * DM Invitation Service Tests
 * Sub-Phase 11 (Polish): DM Privacy System
 */

import { httpsCallable } from 'firebase/functions';
import {
  acceptDirectMessageInvitation,
  createDirectMessageInvitation,
  declineDirectMessageInvitation,
  reportDirectMessageInvitationSpam,
} from '../dmInvitationService';

// Mock Firebase
jest.mock('../../firebase.config', () => ({
  functions: {},
  db: {},
}));

jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
}));

describe('dmInvitationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createDirectMessageInvitation', () => {
    it('should create DM invitation successfully', async () => {
      const mockCallable = jest.fn().mockResolvedValue({
        data: {
          invitationId: 'inv-123',
          recipientName: 'John Doe',
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      const result = await createDirectMessageInvitation('user-456');

      expect(httpsCallable).toHaveBeenCalledWith({}, 'createDirectMessageInvitation');
      expect(mockCallable).toHaveBeenCalledWith({ recipientId: 'user-456' });
      expect(result).toEqual({
        invitationId: 'inv-123',
        recipientName: 'John Doe',
      });
    });

    it('should throw error when creation fails', async () => {
      const mockCallable = jest.fn().mockRejectedValue(new Error('User not found'));
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      await expect(createDirectMessageInvitation('invalid-user')).rejects.toThrow('User not found');
    });
  });

  describe('acceptDirectMessageInvitation', () => {
    it('should accept invitation and return conversation ID', async () => {
      const mockCallable = jest.fn().mockResolvedValue({
        data: {
          conversationId: 'conv-789',
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      const result = await acceptDirectMessageInvitation('inv-123');

      expect(httpsCallable).toHaveBeenCalledWith({}, 'acceptDirectMessageInvitation');
      expect(mockCallable).toHaveBeenCalledWith({ invitationId: 'inv-123' });
      expect(result).toEqual({ conversationId: 'conv-789' });
    });
  });

  describe('declineDirectMessageInvitation', () => {
    it('should decline invitation successfully', async () => {
      const mockCallable = jest.fn().mockResolvedValue({ data: { success: true } });
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      await declineDirectMessageInvitation('inv-123');

      expect(httpsCallable).toHaveBeenCalledWith({}, 'declineDirectMessageInvitation');
      expect(mockCallable).toHaveBeenCalledWith({ invitationId: 'inv-123' });
    });
  });

  describe('reportDirectMessageInvitationSpam', () => {
    it('should report invitation as spam successfully', async () => {
      const mockCallable = jest.fn().mockResolvedValue({ data: { success: true, strikeCount: 3 } });
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      await reportDirectMessageInvitationSpam('inv-123');

      expect(httpsCallable).toHaveBeenCalledWith({}, 'reportDirectMessageInvitationSpam');
      expect(mockCallable).toHaveBeenCalledWith({ invitationId: 'inv-123' });
    });
  });
});

