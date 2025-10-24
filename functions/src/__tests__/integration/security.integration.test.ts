/**
 * Security & Access Control Integration Tests
 * 
 * Tests the security logic against a real Firebase emulator.
 * These tests verify that:
 * - Users can only access conversations they're participants in
 * - Proper errors are thrown for unauthorized access
 * - Search results are filtered correctly
 */

import {
    filterSearchResults,
    verifyConversationAccess,
} from '../../utils/security';
import {
    clearFirestore,
    createTestConversation,
    createTestUser,
} from './setup';

describe('Security & Access Control Integration Tests', () => {
  const user1 = 'user1-security';
  const user2 = 'user2-security';
  const user3 = 'user3-security';
  const conv1 = 'conv1-security';
  const conv2 = 'conv2-security';

  beforeAll(async () => {
    await createTestUser(user1, 'user1@test.com', 'User One');
    await createTestUser(user2, 'user2@test.com', 'User Two');
    await createTestUser(user3, 'user3@test.com', 'User Three');

    // Create conversations
    await createTestConversation(conv1, [user1, user2]);
    await createTestConversation(conv2, [user2, user3]);
  });

  afterAll(async () => {
    await clearFirestore();
  });

  describe('verifyConversationAccess', () => {
    it('should allow access when user is a participant', async () => {
      const result = await verifyConversationAccess(user1, conv1);
      expect(result).toBe(true);
    });

    it('should allow access for all participants', async () => {
      const result1 = await verifyConversationAccess(user1, conv1);
      const result2 = await verifyConversationAccess(user2, conv1);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('should deny access when user is not a participant', async () => {
      // user3 is not in conv1
      await expect(verifyConversationAccess(user3, conv1)).rejects.toThrow(
        'permission-denied'
      );
    });

    it('should throw not-found when conversation does not exist', async () => {
      await expect(
        verifyConversationAccess(user1, 'nonexistent-conv')
      ).rejects.toThrow('not-found');
    });

    it('should verify access correctly for multiple conversations', async () => {
      // user2 is in both conversations
      const result1 = await verifyConversationAccess(user2, conv1);
      const result2 = await verifyConversationAccess(user2, conv2);

      expect(result1).toBe(true);
      expect(result2).toBe(true);

      // user1 is only in conv1
      await expect(verifyConversationAccess(user1, conv2)).rejects.toThrow(
        'permission-denied'
      );
    });
  });

  describe('filterSearchResults', () => {
    it('should only return results where user is a participant', () => {
      const results = [
        {
          id: 'msg1',
          text: 'Message 1',
          conversationId: conv1,
          metadata: {participants: [user1, user2]},
        },
        {
          id: 'msg2',
          text: 'Message 2',
          conversationId: conv2,
          metadata: {participants: [user2, user3]},
        },
        {
          id: 'msg3',
          text: 'Message 3',
          conversationId: conv1,
          metadata: {participants: [user1, user2]},
        },
      ];

      const filtered = filterSearchResults(results, user1);

      expect(filtered).toHaveLength(2);
      expect(filtered[0].id).toBe('msg1');
      expect(filtered[1].id).toBe('msg3');
    });

    it('should return empty array when user has no access', () => {
      const results = [
        {
          id: 'msg1',
          text: 'Message 1',
          metadata: {participants: [user2, user3]},
        },
        {
          id: 'msg2',
          text: 'Message 2',
          metadata: {participants: [user2, user3]},
        },
      ];

      const filtered = filterSearchResults(results, user1);

      expect(filtered).toHaveLength(0);
    });

    it('should return all results when user is in all conversations', () => {
      const results = [
        {
          id: 'msg1',
          text: 'Message 1',
          metadata: {participants: [user1, user2]},
        },
        {
          id: 'msg2',
          text: 'Message 2',
          metadata: {participants: [user2, user3]},
        },
      ];

      const filtered = filterSearchResults(results, user2);

      expect(filtered).toHaveLength(2);
    });

    it('should handle results with missing metadata', () => {
      const results = [
        {
          id: 'msg1',
          text: 'Message 1',
          metadata: {participants: [user1, user2]},
        },
        {
          id: 'msg2',
          text: 'Message 2',
          // No metadata
        },
        {
          id: 'msg3',
          text: 'Message 3',
          metadata: {}, // Empty metadata
        },
      ];

      const filtered = filterSearchResults(results, user1);

      // Should only return msg1 (has valid metadata with user1)
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('msg1');
    });

    it('should handle empty results array', () => {
      const filtered = filterSearchResults([], user1);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('should prevent user from accessing another users conversation', async () => {
      // Create a private conversation between user2 and user3
      const privateConv = 'private-conv-security';
      await createTestConversation(privateConv, [user2, user3]);

      // user1 should not be able to access it
      await expect(
        verifyConversationAccess(user1, privateConv)
      ).rejects.toThrow('permission-denied');
    });

    it('should allow access to group conversations for all members', async () => {
      // Create a group conversation
      const groupConv = 'group-conv-security';
      await createTestConversation(groupConv, [user1, user2, user3]);

      // All three users should have access
      const result1 = await verifyConversationAccess(user1, groupConv);
      const result2 = await verifyConversationAccess(user2, groupConv);
      const result3 = await verifyConversationAccess(user3, groupConv);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });
  });
});

