/**
 * Tests for phone number formatting utilities
 */

import { formatPhoneNumber, extractDigits, formatPhoneNumberDisplay } from '../phoneFormat';

describe('phoneFormat', () => {
  describe('formatPhoneNumber (progressive formatting)', () => {
    it('should format 10 digits correctly', () => {
      expect(formatPhoneNumber('5551234567')).toBe('(555)123-4567');
    });

    it('should handle partial input (1-3 digits)', () => {
      expect(formatPhoneNumber('5')).toBe('5');
      expect(formatPhoneNumber('55')).toBe('55');
      expect(formatPhoneNumber('555')).toBe('555');
    });

    it('should handle partial input (4-6 digits)', () => {
      expect(formatPhoneNumber('5551')).toBe('(555)1');
      expect(formatPhoneNumber('55512')).toBe('(555)12');
      expect(formatPhoneNumber('555123')).toBe('(555)123');
    });

    it('should handle partial input (7-10 digits)', () => {
      expect(formatPhoneNumber('5551234')).toBe('(555)123-4');
      expect(formatPhoneNumber('55512345')).toBe('(555)123-45');
      expect(formatPhoneNumber('555123456')).toBe('(555)123-456');
      expect(formatPhoneNumber('5551234567')).toBe('(555)123-4567');
    });

    it('should strip non-digit characters', () => {
      expect(formatPhoneNumber('(555)123-4567')).toBe('(555)123-4567');
      expect(formatPhoneNumber('555-123-4567')).toBe('(555)123-4567');
      expect(formatPhoneNumber('555.123.4567')).toBe('(555)123-4567');
      expect(formatPhoneNumber('555 123 4567')).toBe('(555)123-4567');
    });

    it('should limit to 10 digits', () => {
      expect(formatPhoneNumber('55512345678')).toBe('(555)123-4567');
      expect(formatPhoneNumber('5551234567890')).toBe('(555)123-4567');
    });

    it('should handle empty string', () => {
      expect(formatPhoneNumber('')).toBe('');
    });
  });

  describe('extractDigits', () => {
    it('should extract digits from formatted phone number', () => {
      expect(extractDigits('(555)123-4567')).toBe('5551234567');
      expect(extractDigits('555-123-4567')).toBe('5551234567');
      expect(extractDigits('(555) 123-4567')).toBe('5551234567');
    });

    it('should handle unformatted number', () => {
      expect(extractDigits('5551234567')).toBe('5551234567');
    });

    it('should handle empty string', () => {
      expect(extractDigits('')).toBe('');
    });

    it('should strip all non-digit characters', () => {
      expect(extractDigits('abc555def123ghi4567')).toBe('5551234567');
      expect(extractDigits('+1 (555) 123-4567')).toBe('15551234567');
    });
  });

  describe('formatPhoneNumberDisplay', () => {
    it('should format 10-digit phone number with space', () => {
      expect(formatPhoneNumberDisplay('5551234567')).toBe('(555) 123-4567');
    });

    it('should return original if not 10 digits', () => {
      expect(formatPhoneNumberDisplay('555123456')).toBe('555123456');
      expect(formatPhoneNumberDisplay('55512345678')).toBe('55512345678');
    });

    it('should return original if empty', () => {
      expect(formatPhoneNumberDisplay('')).toBe('');
    });

    it('should return original if null/undefined', () => {
      expect(formatPhoneNumberDisplay(null as any)).toBe(null);
      expect(formatPhoneNumberDisplay(undefined as any)).toBe(undefined);
    });
  });
});

