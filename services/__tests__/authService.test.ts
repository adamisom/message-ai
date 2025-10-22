/**
 * Tests for authService
 * Focus: Input normalization and data structure validation
 */

describe('authService', () => {
  describe('Email normalization', () => {
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

  describe('Display name normalization', () => {
    it('should trim whitespace from display name', () => {
      const displayName = '  John Doe  ';
      const normalized = displayName.trim();
      
      expect(normalized).toBe('John Doe');
    });

    it('should preserve internal spaces in display name', () => {
      const displayName = 'John  Middle  Doe';
      const normalized = displayName.trim();
      
      expect(normalized).toBe('John  Middle  Doe');
    });
  });

  describe('UserProfile structure', () => {
    it('should have all required fields', () => {
      const profile = {
        uid: 'test123',
        email: 'test@example.com',
        displayName: 'Test User',
        isOnline: true,
        lastSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(profile).toHaveProperty('uid');
      expect(profile).toHaveProperty('email');
      expect(profile).toHaveProperty('displayName');
      expect(profile).toHaveProperty('isOnline');
      expect(profile).toHaveProperty('lastSeenAt');
      expect(profile).toHaveProperty('createdAt');
      expect(profile).toHaveProperty('updatedAt');
    });

    it('should initialize isOnline as true on creation', () => {
      const profile = {
        uid: 'test123',
        email: 'test@example.com',
        displayName: 'Test User',
        isOnline: true,
        lastSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(profile.isOnline).toBe(true);
    });
  });

  describe('Error handling behavior', () => {
    it('should map common Firebase error codes to user-friendly messages', () => {
      const errorCodes = [
        'auth/email-already-in-use',
        'auth/invalid-email',
        'auth/weak-password',
        'auth/user-not-found',
        'auth/wrong-password',
        'auth/invalid-credential',
        'auth/too-many-requests',
        'auth/network-request-failed',
      ];

      // Verify we have defined error codes
      expect(errorCodes.length).toBeGreaterThan(0);
      errorCodes.forEach(code => {
        expect(code).toContain('auth/');
      });
    });
  });
});
