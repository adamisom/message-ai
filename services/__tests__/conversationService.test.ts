/**
 * Unit tests for conversation soft-delete functionality
 */

import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { hideConversation } from '../conversationService';

// Mock Firebase
jest.mock('../../firebase.config', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn((value) => ({ _type: 'arrayUnion', value })),
}));

describe('conversationService', () => {
  const mockDoc = doc as jest.Mock;
  const mockUpdateDoc = updateDoc as jest.Mock;
  const mockArrayUnion = arrayUnion as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Suppress console logs
  });

  describe('hideConversation', () => {
    it('should add user to inactiveParticipants array', async () => {
      const conversationId = 'conv123';
      const userId = 'user456';
      const mockConvRef = { id: conversationId };

      mockDoc.mockReturnValue(mockConvRef);
      mockArrayUnion.mockReturnValue({ _type: 'arrayUnion', value: userId });

      await hideConversation(conversationId, userId);

      // Verify doc reference was created correctly
      expect(mockDoc).toHaveBeenCalledWith({}, 'conversations', conversationId);

      // Verify update was called with arrayUnion
      expect(mockUpdateDoc).toHaveBeenCalledWith(mockConvRef, {
        inactiveParticipants: { _type: 'arrayUnion', value: userId },
      });
    });

    it('should handle multiple users hiding the same conversation', async () => {
      const conversationId = 'conv123';
      const user1 = 'user1';
      const user2 = 'user2';

      // User 1 hides
      await hideConversation(conversationId, user1);
      expect(mockArrayUnion).toHaveBeenCalledWith(user1);

      // User 2 hides (same conversation)
      await hideConversation(conversationId, user2);
      expect(mockArrayUnion).toHaveBeenCalledWith(user2);

      // Both should have been called
      expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
    });

    it('should throw error if update fails', async () => {
      const conversationId = 'conv123';
      const userId = 'user456';

      mockUpdateDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(hideConversation(conversationId, userId)).rejects.toThrow(
        'Firestore error'
      );
    });
  });
});

