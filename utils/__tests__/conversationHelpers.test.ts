/**
 * Unit tests for conversation name display logic
 * This is business-critical logic that determines how conversations are labeled
 */

import { getConversationName, generateConversationId } from '../conversationHelpers';

describe('getConversationName', () => {
  const currentUserId = 'user1';

  describe('group conversations', () => {
    it('should return group name when provided', () => {
      const conversation = {
        id: 'group1',
        type: 'group' as const,
        name: 'Team Chat',
        participants: ['user1', 'user2', 'user3'],
        participantDetails: {},
      };

      expect(getConversationName(conversation, currentUserId)).toBe('Team Chat');
    });

    it('should return "Unnamed Group" when name is missing', () => {
      const conversation = {
        id: 'group1',
        type: 'group' as const,
        participants: ['user1', 'user2', 'user3'],
        participantDetails: {},
      };

      expect(getConversationName(conversation, currentUserId)).toBe('Unnamed Group');
    });

    it('should return "Unnamed Group" when name is empty string', () => {
      const conversation = {
        id: 'group1',
        type: 'group' as const,
        name: '',
        participants: ['user1', 'user2', 'user3'],
        participantDetails: {},
      };

      expect(getConversationName(conversation, currentUserId)).toBe('Unnamed Group');
    });
  });

  describe('direct conversations', () => {
    it('should return other user\'s display name', () => {
      const conversation = {
        id: 'direct1',
        type: 'direct' as const,
        participants: ['user1', 'user2'],
        participantDetails: {
          user1: { displayName: 'Alice', email: 'alice@example.com' },
          user2: { displayName: 'Bob', email: 'bob@example.com' },
        },
      };

      expect(getConversationName(conversation, 'user1')).toBe('Bob');
    });

    it('should work regardless of participant order', () => {
      const conversation = {
        id: 'direct1',
        type: 'direct' as const,
        participants: ['user2', 'user1'], // reversed order
        participantDetails: {
          user1: { displayName: 'Alice', email: 'alice@example.com' },
          user2: { displayName: 'Bob', email: 'bob@example.com' },
        },
      };

      expect(getConversationName(conversation, 'user1')).toBe('Bob');
    });

    it('should return "Unknown User" when other user has no displayName', () => {
      const conversation = {
        id: 'direct1',
        type: 'direct' as const,
        participants: ['user1', 'user2'],
        participantDetails: {
          user1: { displayName: 'Alice', email: 'alice@example.com' },
          user2: { displayName: '', email: 'bob@example.com' }, // empty displayName
        },
      };

      expect(getConversationName(conversation, 'user1')).toBe('Unknown User');
    });

    it('should return "Unknown" when other user is not in participants', () => {
      const conversation = {
        id: 'direct1',
        type: 'direct' as const,
        participants: ['user1'], // only current user
        participantDetails: {
          user1: { displayName: 'Alice', email: 'alice@example.com' },
        },
      };

      expect(getConversationName(conversation, 'user1')).toBe('Unknown');
    });

    it('should return "Unknown" when participantDetails is missing other user', () => {
      const conversation = {
        id: 'direct1',
        type: 'direct' as const,
        participants: ['user1', 'user2'],
        participantDetails: {
          user1: { displayName: 'Alice', email: 'alice@example.com' },
          // user2 missing from participantDetails
        },
      };

      expect(getConversationName(conversation, 'user1')).toBe('Unknown User');
    });
  });

  describe('edge cases', () => {
    it('should handle conversation with no participants', () => {
      const conversation = {
        id: 'empty1',
        type: 'direct' as const,
        participants: [],
        participantDetails: {},
      };

      expect(getConversationName(conversation, currentUserId)).toBe('Unknown');
    });

    it('should handle null/undefined participantDetails gracefully', () => {
      const conversation = {
        id: 'direct1',
        type: 'direct' as const,
        participants: ['user1', 'user2'],
        participantDetails: {} as any, // empty object
      };

      expect(getConversationName(conversation, 'user1')).toBe('Unknown User');
    });
  });
});

describe('generateConversationId', () => {
  describe('consistency', () => {
    it('should generate same ID regardless of user order', () => {
      const id1 = generateConversationId('user1', 'user2');
      const id2 = generateConversationId('user2', 'user1');

      expect(id1).toBe(id2);
    });

    it('should use underscore as delimiter', () => {
      const id = generateConversationId('alice', 'bob');
      
      expect(id).toContain('_');
      expect(id.split('_')).toHaveLength(2);
    });

    it('should sort UIDs alphabetically', () => {
      const id = generateConversationId('zebra', 'apple');
      
      expect(id).toBe('apple_zebra');
    });
  });

  describe('workspace context', () => {
    it('should include workspace ID when provided', () => {
      const id = generateConversationId('user1', 'user2', 'workspace123');
      
      expect(id).toBe('workspace123_user1_user2');
    });

    it('should generate different IDs for workspace vs general DMs', () => {
      const generalId = generateConversationId('user1', 'user2');
      const workspaceId = generateConversationId('user1', 'user2', 'workspace123');
      
      expect(generalId).toBe('user1_user2');
      expect(workspaceId).toBe('workspace123_user1_user2');
      expect(generalId).not.toBe(workspaceId);
    });

    it('should generate different IDs for different workspaces', () => {
      const workspace1Id = generateConversationId('user1', 'user2', 'workspace1');
      const workspace2Id = generateConversationId('user1', 'user2', 'workspace2');
      
      expect(workspace1Id).not.toBe(workspace2Id);
    });

    it('should still sort UIDs when workspace ID is present', () => {
      const id1 = generateConversationId('zebra', 'apple', 'workspace123');
      const id2 = generateConversationId('apple', 'zebra', 'workspace123');
      
      expect(id1).toBe(id2);
      expect(id1).toBe('workspace123_apple_zebra');
    });
  });

  describe('different users', () => {
    it('should generate different IDs for different user pairs', () => {
      const id1 = generateConversationId('user1', 'user2');
      const id2 = generateConversationId('user1', 'user3');

      expect(id1).not.toBe(id2);
    });

    it('should work with numeric-like UIDs', () => {
      const id = generateConversationId('123', '456');
      
      expect(id).toBe('123_456');
    });

    it('should work with long UIDs', () => {
      const longUid1 = 'a'.repeat(100);
      const longUid2 = 'b'.repeat(100);
      const id = generateConversationId(longUid1, longUid2);

      expect(id).toBe(`${longUid1}_${longUid2}`);
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      const id = generateConversationId('', 'user1');
      
      expect(id).toBe('_user1');
    });

    it('should handle same user (self-chat)', () => {
      const id = generateConversationId('user1', 'user1');
      
      expect(id).toBe('user1_user1');
    });

    it('should handle special characters in UIDs', () => {
      const id = generateConversationId('user@domain', 'user#123');
      
      expect(id).toContain('_');
      expect(id.split('_')).toHaveLength(2);
    });
  });
});

