/**
 * Unit tests for New Chat auto-detection logic
 * Sub-Phase 11: Polish & Testing - Improved UX
 */

import { determineChatType, extractDigits, formatPhoneNumber, generateCreateButtonText, validateUserList } from '../new-chat-helpers';

describe('New Chat Auto-Detection Logic', () => {
  describe('determineChatType', () => {
    it('should return direct for 1 user', () => {
      const users = [{ uid: 'user1', email: 'user1@test.com', displayName: 'User 1' }];
      expect(determineChatType(users)).toBe('direct');
    });

    it('should return group for 2 users', () => {
      const users = [
        { uid: 'user1', email: 'user1@test.com', displayName: 'User 1' },
        { uid: 'user2', email: 'user2@test.com', displayName: 'User 2' },
      ];
      expect(determineChatType(users)).toBe('group');
    });

    it('should return group for 24 users (max excluding current user)', () => {
      const users = Array.from({ length: 24 }, (_, i) => ({
        uid: `user${i}`,
        email: `user${i}@test.com`,
        displayName: `User ${i}`,
      }));
      expect(determineChatType(users)).toBe('group');
    });

    it('should return null for 0 users', () => {
      expect(determineChatType([])).toBeNull();
    });

    it('should return null for more than 24 users', () => {
      const users = Array.from({ length: 25 }, (_, i) => ({
        uid: `user${i}`,
        email: `user${i}@test.com`,
        displayName: `User ${i}`,
      }));
      expect(determineChatType(users)).toBeNull();
    });
  });

  describe('generateCreateButtonText', () => {
    it('should generate direct chat text with user name', () => {
      const users = [{ uid: 'user1', email: 'alice@test.com', displayName: 'Alice Smith' }];
      expect(generateCreateButtonText(users, false)).toBe('Chat with Alice Smith');
    });

    it('should generate group chat text with member count', () => {
      const users = [
        { uid: 'user1', email: 'alice@test.com', displayName: 'Alice' },
        { uid: 'user2', email: 'bob@test.com', displayName: 'Bob' },
      ];
      expect(generateCreateButtonText(users, false)).toBe('Create Group (3 members)');
    });

    it('should show loading text when loading', () => {
      const users = [{ uid: 'user1', email: 'alice@test.com', displayName: 'Alice' }];
      expect(generateCreateButtonText(users, true)).toBe('Creating...');
    });

    it('should handle long display names gracefully', () => {
      const users = [{ uid: 'user1', email: 'test@test.com', displayName: 'Dr. Alexander Wellington-Smythe III' }];
      const buttonText = generateCreateButtonText(users, false);
      expect(buttonText).toContain('Dr. Alexander Wellington-Smythe III');
      expect(buttonText.length).toBeLessThan(100); // Reasonable limit
    });

    it('should show correct count for maximum group size', () => {
      const users = Array.from({ length: 24 }, (_, i) => ({
        uid: `user${i}`,
        email: `user${i}@test.com`,
        displayName: `User ${i}`,
      }));
      expect(generateCreateButtonText(users, false)).toBe('Create Group (25 members)');
    });
  });

  describe('validateUserList', () => {
    const currentUserId = 'current-user';

    it('should pass validation for 1 user (direct chat)', () => {
      const users = [{ uid: 'user1', email: 'alice@test.com', displayName: 'Alice' }];
      const result = validateUserList(users, currentUserId);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass validation for 2 users (group chat)', () => {
      const users = [
        { uid: 'user1', email: 'alice@test.com', displayName: 'Alice' },
        { uid: 'user2', email: 'bob@test.com', displayName: 'Bob' },
      ];
      const result = validateUserList(users, currentUserId);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail validation for 0 users', () => {
      const result = validateUserList([], currentUserId);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Please add at least one user');
    });

    it('should fail validation for 25+ users (exceeds limit)', () => {
      const users = Array.from({ length: 25 }, (_, i) => ({
        uid: `user${i}`,
        email: `user${i}@test.com`,
        displayName: `User ${i}`,
      }));
      const result = validateUserList(users, currentUserId);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Maximum 25 members per group (including you)');
    });

    it('should fail if current user is in the list', () => {
      const users = [
        { uid: 'user1', email: 'alice@test.com', displayName: 'Alice' },
        { uid: currentUserId, email: 'me@test.com', displayName: 'Me' },
      ];
      const result = validateUserList(users, currentUserId);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("You can't add yourself to the chat");
    });

    it('should fail if duplicate users exist', () => {
      const users = [
        { uid: 'user1', email: 'alice@test.com', displayName: 'Alice' },
        { uid: 'user1', email: 'alice@test.com', displayName: 'Alice' },
      ];
      const result = validateUserList(users, currentUserId);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Duplicate users detected');
    });

    it('should pass validation for 24 users (at limit)', () => {
      const users = Array.from({ length: 24 }, (_, i) => ({
        uid: `user${i}`,
        email: `user${i}@test.com`,
        displayName: `User ${i}`,
      }));
      const result = validateUserList(users, currentUserId);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with empty display name', () => {
      const users = [{ uid: 'user1', email: 'test@test.com', displayName: '' }];
      const buttonText = generateCreateButtonText(users, false);
      expect(buttonText).toBe('Chat with User'); // Falls back to 'User' for empty names
    });

    it('should handle user with special characters in name', () => {
      const users = [{ uid: 'user1', email: 'test@test.com', displayName: 'José María O\'Brien' }];
      const buttonText = generateCreateButtonText(users, false);
      expect(buttonText).toBe('Chat with José María O\'Brien');
    });

    it('should detect group chat even with exactly 2 users', () => {
      const users = [
        { uid: 'user1', email: 'alice@test.com', displayName: 'Alice' },
        { uid: 'user2', email: 'bob@test.com', displayName: 'Bob' },
      ];
      expect(determineChatType(users)).toBe('group');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should not format when 3 or fewer digits', () => {
      expect(formatPhoneNumber('')).toBe('');
      expect(formatPhoneNumber('5')).toBe('5');
      expect(formatPhoneNumber('55')).toBe('55');
      expect(formatPhoneNumber('555')).toBe('555');
    });

    it('should add parentheses after 3 digits', () => {
      expect(formatPhoneNumber('5551')).toBe('(555)1');
      expect(formatPhoneNumber('55512')).toBe('(555)12');
      expect(formatPhoneNumber('555123')).toBe('(555)123');
    });

    it('should add dash before last 4 digits', () => {
      expect(formatPhoneNumber('5551234')).toBe('(555)123-4');
      expect(formatPhoneNumber('55512345')).toBe('(555)123-45');
      expect(formatPhoneNumber('555123456')).toBe('(555)123-456');
      expect(formatPhoneNumber('5551234567')).toBe('(555)123-4567');
    });

    it('should limit to 10 digits', () => {
      expect(formatPhoneNumber('55512345678')).toBe('(555)123-4567');
      expect(formatPhoneNumber('555123456789')).toBe('(555)123-4567');
    });

    it('should strip existing formatting', () => {
      expect(formatPhoneNumber('(555)123-4567')).toBe('(555)123-4567');
      expect(formatPhoneNumber('555-123-4567')).toBe('(555)123-4567');
      expect(formatPhoneNumber('555.123.4567')).toBe('(555)123-4567');
      expect(formatPhoneNumber('(555) 123-4567')).toBe('(555)123-4567');
    });

    it('should handle mixed input with letters and symbols', () => {
      expect(formatPhoneNumber('5a5b5c1d2e3f4g5h6i7j')).toBe('(555)123-4567');
      expect(formatPhoneNumber('555ABC123DEF4567')).toBe('(555)123-4567');
    });

    it('should handle partial formatting during typing', () => {
      // Simulating user typing "5551234567"
      expect(formatPhoneNumber('5')).toBe('5');
      expect(formatPhoneNumber('55')).toBe('55');
      expect(formatPhoneNumber('555')).toBe('555');
      expect(formatPhoneNumber('(555')).toBe('555'); // Strip incomplete format
      expect(formatPhoneNumber('(555)')).toBe('555'); // Strip incomplete format
      expect(formatPhoneNumber('(555)1')).toBe('(555)1');
      expect(formatPhoneNumber('(555)12')).toBe('(555)12');
      expect(formatPhoneNumber('(555)123')).toBe('(555)123');
      expect(formatPhoneNumber('(555)123-')).toBe('(555)123'); // Strip incomplete format
      expect(formatPhoneNumber('(555)123-4')).toBe('(555)123-4');
      expect(formatPhoneNumber('(555)123-45')).toBe('(555)123-45');
      expect(formatPhoneNumber('(555)123-456')).toBe('(555)123-456');
      expect(formatPhoneNumber('(555)123-4567')).toBe('(555)123-4567');
    });

    it('should handle empty and whitespace input', () => {
      expect(formatPhoneNumber('')).toBe('');
      expect(formatPhoneNumber(' ')).toBe('');
      expect(formatPhoneNumber('   ')).toBe('');
    });

    it('should handle special characters only', () => {
      expect(formatPhoneNumber('()- ')).toBe('');
      expect(formatPhoneNumber('...')).toBe('');
      expect(formatPhoneNumber('---')).toBe('');
    });
  });

  describe('extractDigits', () => {
    it('should extract digits from formatted phone number', () => {
      expect(extractDigits('(555)123-4567')).toBe('5551234567');
    });

    it('should extract digits from various formats', () => {
      expect(extractDigits('555-123-4567')).toBe('5551234567');
      expect(extractDigits('555.123.4567')).toBe('5551234567');
      expect(extractDigits('5551234567')).toBe('5551234567');
      expect(extractDigits('(555)1234567')).toBe('5551234567');
      expect(extractDigits('(555) 123-4567')).toBe('5551234567');
    });

    it('should handle partial numbers', () => {
      expect(extractDigits('555')).toBe('555');
      expect(extractDigits('(555)123')).toBe('555123');
      expect(extractDigits('(555)123-45')).toBe('55512345');
    });

    it('should remove all non-digit characters', () => {
      expect(extractDigits('abc555def123ghi4567jkl')).toBe('5551234567');
      expect(extractDigits('+1 (555) 123-4567')).toBe('15551234567');
    });

    it('should handle empty and whitespace input', () => {
      expect(extractDigits('')).toBe('');
      expect(extractDigits(' ')).toBe('');
      expect(extractDigits('   ')).toBe('');
    });

    it('should handle no digits present', () => {
      expect(extractDigits('abc')).toBe('');
      expect(extractDigits('()- ')).toBe('');
      expect(extractDigits('...')).toBe('');
    });
  });

  describe('formatPhoneNumber + extractDigits (Round-trip)', () => {
    it('should maintain digits through format and extract cycle', () => {
      const testNumbers = [
        '5551234567',
        '1234567890',
        '9998887777',
      ];

      testNumbers.forEach(number => {
        const formatted = formatPhoneNumber(number);
        const extracted = extractDigits(formatted);
        expect(extracted).toBe(number);
      });
    });

    it('should normalize different input formats to same output', () => {
      const inputs = [
        '5551234567',
        '(555)123-4567',
        '(555) 123-4567',
        '555-123-4567',
        '555.123.4567',
        '555 123 4567',
      ];

      const expectedFormatted = '(555)123-4567';
      const expectedDigits = '5551234567';

      inputs.forEach(input => {
        const formatted = formatPhoneNumber(input);
        expect(formatted).toBe(expectedFormatted);
        expect(extractDigits(formatted)).toBe(expectedDigits);
      });
    });
  });
});

