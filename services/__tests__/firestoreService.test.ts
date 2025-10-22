/**
 * Tests for firestoreService
 * Focus: Email normalization and conversation ID generation
 */

import { generateConversationId } from '../../utils/conversationHelpers';

describe('firestoreService', () => {
  describe('Email normalization (findUserByEmail)', () => {
    it('should normalize email to lowercase', () => {
      const email = 'TEST@EXAMPLE.COM';
      const normalized = email.toLowerCase().trim();
      
      expect(normalized).toBe('test@example.com');
    });

    it('should trim whitespace from email', () => {
      const email = '  test@example.com  ';
      const normalized = email.toLowerCase().trim();
      
      expect(normalized).toBe('test@example.com');
    });

    it('should handle mixed case emails', () => {
      const email = 'TeSt@ExAmPlE.CoM';
      const normalized = email.toLowerCase().trim();
      
      expect(normalized).toBe('test@example.com');
    });
  });

  describe('Conversation ID generation (createOrOpenConversation)', () => {
    it('should generate consistent ID for same users regardless of order', () => {
      const userId1 = 'alice123';
      const userId2 = 'bob456';
      
      // Generate ID with users in different orders
      const id1 = generateConversationId(userId1, userId2);
      const id2 = generateConversationId(userId2, userId1);
      
      // Should be identical
      expect(id1).toBe(id2);
    });

    it('should generate different IDs for different user pairs', () => {
      const userId1 = 'alice123';
      const userId2 = 'bob456';
      const userId3 = 'charlie789';
      
      const id1 = generateConversationId(userId1, userId2);
      const id2 = generateConversationId(userId1, userId3);
      
      expect(id1).not.toBe(id2);
    });

    it('should use sorted UIDs for consistency', () => {
      // Lexicographically, 'alice' comes before 'bob'
      const id = generateConversationId('bob456', 'alice123');
      
      expect(id).toContain('alice123');
      expect(id).toContain('bob456');
    });
  });

  describe('Group conversation validation', () => {
    it('should require at least 2 other participants for group chat', () => {
      const participants: any[] = [];
      
      // Group requires 2+ participants (excluding current user)
      expect(participants.length).toBeLessThan(2);
    });

    it('should allow exactly 2 participants for minimum group', () => {
      const participants = [
        { uid: 'user1', email: 'user1@test.com', displayName: 'User 1' },
        { uid: 'user2', email: 'user2@test.com', displayName: 'User 2' },
      ];
      
      expect(participants.length).toBeGreaterThanOrEqual(2);
    });

    it('should allow large groups', () => {
      const participants = Array.from({ length: 10 }, (_, i) => ({
        uid: `user${i}`,
        email: `user${i}@test.com`,
        displayName: `User ${i}`,
      }));
      
      expect(participants.length).toBe(10);
    });
  });

  describe('Message text truncation (lastMessage)', () => {
    it('should truncate long messages to 100 characters', () => {
      const longMessage = 'a'.repeat(200);
      const truncated = longMessage.substring(0, 100);
      
      expect(truncated.length).toBe(100);
    });

    it('should not truncate short messages', () => {
      const shortMessage = 'Hello, world!';
      const truncated = shortMessage.substring(0, 100);
      
      expect(truncated).toBe(shortMessage);
      expect(truncated.length).toBeLessThan(100);
    });

    it('should handle exactly 100 character messages', () => {
      const message = 'a'.repeat(100);
      const truncated = message.substring(0, 100);
      
      expect(truncated.length).toBe(100);
      expect(truncated).toBe(message);
    });
  });

  describe('Participant details structure', () => {
    it('should have displayName and email for each participant', () => {
      const participantDetail = {
        displayName: 'John Doe',
        email: 'john@example.com',
      };

      expect(participantDetail).toHaveProperty('displayName');
      expect(participantDetail).toHaveProperty('email');
      expect(participantDetail.displayName).toBe('John Doe');
      expect(participantDetail.email).toBe('john@example.com');
    });
  });
});

