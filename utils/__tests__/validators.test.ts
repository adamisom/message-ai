/**
 * Tests for validation utility functions
 * High-value tests for critical user input validation
 */

import {
  validateEmail,
  validatePassword,
  validateDisplayName,
  getEmailError,
  getPasswordError,
  getDisplayNameError,
  validatePhoneNumber,
  getPhoneNumberError,
} from '../validators';

describe('validateEmail', () => {
  describe('valid emails', () => {
    it('should accept valid email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@example.com')).toBe(true);
      expect(validateEmail('user+tag@example.co.uk')).toBe(true);
      expect(validateEmail('test123@subdomain.example.com')).toBe(true);
    });

    it('should trim whitespace and still validate', () => {
      expect(validateEmail('  test@example.com  ')).toBe(true);
      expect(validateEmail('\ntest@example.com\n')).toBe(true);
    });
  });

  describe('invalid emails', () => {
    it('should reject emails without @', () => {
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('test.example.com')).toBe(false);
    });

    it('should reject emails without domain', () => {
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('test@example')).toBe(false);
    });

    it('should reject emails with spaces', () => {
      expect(validateEmail('test @example.com')).toBe(false);
      expect(validateEmail('test@exam ple.com')).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('   ')).toBe(false);
    });

    it('should reject non-string inputs', () => {
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
      expect(validateEmail(123 as any)).toBe(false);
    });

    it('should handle special characters in email (basic validation only)', () => {
      // Note: Our validator does basic format checking, not XSS/SQL injection prevention
      // That's handled by Firebase Auth and proper server-side validation
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@@example.com')).toBe(false);
    });
  });
});

describe('validatePassword', () => {
  describe('valid passwords', () => {
    it('should accept passwords with minimum 6 characters', () => {
      expect(validatePassword('123456')).toBe(true);
      expect(validatePassword('password')).toBe(true);
      expect(validatePassword('Pass123!')).toBe(true);
    });

    it('should accept long passwords', () => {
      expect(validatePassword('a'.repeat(100))).toBe(true);
      expect(validatePassword('VeryLongPasswordWith123Special!')).toBe(true);
    });
  });

  describe('invalid passwords', () => {
    it('should reject passwords shorter than 6 characters', () => {
      expect(validatePassword('12345')).toBe(false);
      expect(validatePassword('abc')).toBe(false);
      expect(validatePassword('1')).toBe(false);
    });

    it('should reject empty passwords', () => {
      expect(validatePassword('')).toBe(false);
    });

    it('should reject non-string inputs', () => {
      expect(validatePassword(null as any)).toBe(false);
      expect(validatePassword(undefined as any)).toBe(false);
      expect(validatePassword(123456 as any)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should accept exactly 6 characters', () => {
      expect(validatePassword('abcdef')).toBe(true);
    });

    it('should accept passwords with special characters', () => {
      expect(validatePassword('!@#$%^')).toBe(true);
      expect(validatePassword('Pass!@#')).toBe(true);
    });
  });
});

describe('validateDisplayName', () => {
  describe('valid display names', () => {
    it('should accept normal names', () => {
      expect(validateDisplayName('John Doe')).toBe(true);
      expect(validateDisplayName('Alice')).toBe(true);
      expect(validateDisplayName('Bob Smith Jr.')).toBe(true);
    });

    it('should accept names with special characters', () => {
      expect(validateDisplayName("O'Connor")).toBe(true);
      expect(validateDisplayName('José García')).toBe(true);
      expect(validateDisplayName('李明')).toBe(true);
    });

    it('should trim whitespace', () => {
      expect(validateDisplayName('  John Doe  ')).toBe(true);
    });
  });

  describe('invalid display names', () => {
    it('should reject empty names', () => {
      expect(validateDisplayName('')).toBe(false);
      expect(validateDisplayName('   ')).toBe(false);
    });

    it('should reject names longer than 50 characters', () => {
      expect(validateDisplayName('a'.repeat(51))).toBe(false);
      const longName = 'Very Long Name That Definitely Exceeds The Fifty Character Limit';
      expect(longName.length).toBeGreaterThan(50);
      expect(validateDisplayName(longName)).toBe(false);
    });

    it('should reject non-string inputs', () => {
      expect(validateDisplayName(null as any)).toBe(false);
      expect(validateDisplayName(undefined as any)).toBe(false);
      expect(validateDisplayName(123 as any)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should accept exactly 50 characters', () => {
      expect(validateDisplayName('a'.repeat(50))).toBe(true);
    });

    it('should accept single character names', () => {
      expect(validateDisplayName('X')).toBe(true);
    });
  });
});

describe('getEmailError', () => {
  it('should return null for valid emails', () => {
    expect(getEmailError('test@example.com')).toBeNull();
    expect(getEmailError('user@domain.co')).toBeNull();
  });

  it('should return "Email is required" for empty input', () => {
    expect(getEmailError('')).toBe('Email is required');
  });

  it('should return validation error for invalid format', () => {
    expect(getEmailError('notanemail')).toBe('Please enter a valid email address');
    expect(getEmailError('test@')).toBe('Please enter a valid email address');
  });
});

describe('getPasswordError', () => {
  it('should return null for valid passwords', () => {
    expect(getPasswordError('password123')).toBeNull();
    expect(getPasswordError('123456')).toBeNull();
  });

  it('should return "Password is required" for empty input', () => {
    expect(getPasswordError('')).toBe('Password is required');
  });

  it('should return length error for short passwords', () => {
    expect(getPasswordError('12345')).toBe('Password must be at least 6 characters');
    expect(getPasswordError('abc')).toBe('Password must be at least 6 characters');
  });
});

describe('getDisplayNameError', () => {
  it('should return null for valid names', () => {
    expect(getDisplayNameError('John Doe')).toBeNull();
    expect(getDisplayNameError('Alice')).toBeNull();
  });

  it('should return "Display name is required" for empty input', () => {
    expect(getDisplayNameError('')).toBe('Display name is required');
    expect(getDisplayNameError('   ')).toBe('Display name is required');
  });

  it('should return length error for names over 50 characters', () => {
    expect(getDisplayNameError('a'.repeat(51))).toBe(
      'Display name must be 50 characters or less'
    );
  });
});

// Sub-Phase 11 (Polish): Phone Number Validation Tests
describe('validatePhoneNumber', () => {
  describe('valid phone numbers', () => {
    it('should accept valid 10-digit phone numbers', () => {
      expect(validatePhoneNumber('5551234567')).toBe(true);
      expect(validatePhoneNumber('1234567890')).toBe(true);
      expect(validatePhoneNumber('9999999999')).toBe(true);
    });

    it('should accept phone numbers with formatting', () => {
      expect(validatePhoneNumber('(555) 123-4567')).toBe(true);
      expect(validatePhoneNumber('555-123-4567')).toBe(true);
      expect(validatePhoneNumber('555.123.4567')).toBe(true);
      expect(validatePhoneNumber('1-555-123-4567')).toBe(true);
      expect(validatePhoneNumber('+1 555 123 4567')).toBe(true);
    });
  });

  describe('invalid phone numbers', () => {
    it('should reject phone numbers with too few digits', () => {
      expect(validatePhoneNumber('123456789')).toBe(false);
      expect(validatePhoneNumber('55512345')).toBe(false);
      expect(validatePhoneNumber('123')).toBe(false);
    });

    it('should reject phone numbers with too many digits', () => {
      expect(validatePhoneNumber('22345678901')).toBe(false); // 11 digits but doesn't start with 1
      expect(validatePhoneNumber('555123456789')).toBe(false); // 12 digits
      expect(validatePhoneNumber('123456789012')).toBe(false); // 12 digits starting with 1
    });

    it('should reject empty or invalid input', () => {
      expect(validatePhoneNumber('')).toBe(false);
      expect(validatePhoneNumber('   ')).toBe(false);
      expect(validatePhoneNumber('abcd1234567')).toBe(false);
      expect(validatePhoneNumber('!@#$%^&*()')).toBe(false);
    });
  });
});

describe('getPhoneNumberError', () => {
  it('should return required error for empty phone', () => {
    const error = getPhoneNumberError('');
    expect(error).toBe("Phone number is required because that's how friends find you");
  });

  it('should return required error for whitespace-only phone', () => {
    const error = getPhoneNumberError('   ');
    expect(error).toBe("Phone number is required because that's how friends find you");
  });

  it('should return invalid format error for invalid phone', () => {
    expect(getPhoneNumberError('123')).toBe('Please enter a valid 10-digit phone number (US/Canada only)');
    expect(getPhoneNumberError('abcd1234567')).toBe('Please enter a valid 10-digit phone number (US/Canada only)');
    expect(getPhoneNumberError('22345678901')).toBe('Please enter a valid 10-digit phone number (US/Canada only)');
  });

  it('should return null for valid phone', () => {
    expect(getPhoneNumberError('5551234567')).toBeNull();
    expect(getPhoneNumberError('(555) 123-4567')).toBeNull();
    expect(getPhoneNumberError('555-123-4567')).toBeNull();
  });
});

