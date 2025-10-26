import { formatMessageTime } from '../timeFormat';

describe('formatMessageTime - Smart Date Formatting', () => {
  // Use a fixed "now" for consistent testing
  const NOW = new Date('2025-10-26T15:00:00'); // Sunday, Oct 26, 2025 at 3:00 PM

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Today Messages', () => {
    it('should show only time for today', () => {
      const today = new Date('2025-10-26T14:30:00');
      const result = formatMessageTime(today);
      
      expect(result).toBe('2:30 PM');
      expect(result).not.toContain('Oct');
      expect(result).not.toContain('Yesterday');
    });

    it('should handle different times of day correctly', () => {
      const morning = new Date('2025-10-26T09:15:00');
      const afternoon = new Date('2025-10-26T14:45:00');
      const evening = new Date('2025-10-26T19:30:00');

      expect(formatMessageTime(morning)).toBe('9:15 AM');
      expect(formatMessageTime(afternoon)).toBe('2:45 PM');
      expect(formatMessageTime(evening)).toBe('7:30 PM');
    });

    it('should handle midnight correctly', () => {
      const midnight = new Date('2025-10-26T00:00:00');
      const result = formatMessageTime(midnight);
      
      expect(result).toContain('12:00 AM');
    });

    it('should handle noon correctly', () => {
      const noon = new Date('2025-10-26T12:00:00');
      const result = formatMessageTime(noon);
      
      expect(result).toContain('12:00 PM');
    });
  });

  describe('Yesterday Messages', () => {
    it('should show "Yesterday" for yesterday', () => {
      const yesterday = new Date('2025-10-25T14:30:00');
      const result = formatMessageTime(yesterday);
      
      expect(result).toContain('Yesterday');
      expect(result).toContain('2:30 PM');
      expect(result).not.toContain('Oct');
    });

    it('should format yesterday time correctly', () => {
      const yesterday = new Date('2025-10-25T09:45:00');
      const result = formatMessageTime(yesterday);
      
      expect(result).toBe('Yesterday, 9:45 AM');
    });
  });

  describe('Last Week Messages (2-6 days ago)', () => {
    it('should show day name for 2 days ago', () => {
      const twoDaysAgo = new Date('2025-10-24T14:30:00'); // Friday
      const result = formatMessageTime(twoDaysAgo);
      
      expect(result).toContain('Friday');
      expect(result).toContain('2:30 PM');
      expect(result).not.toContain('Oct');
      expect(result).not.toContain('Yesterday');
    });

    it('should show day name for 3 days ago', () => {
      const threeDaysAgo = new Date('2025-10-23T14:30:00'); // Thursday
      const result = formatMessageTime(threeDaysAgo);
      
      expect(result).toContain('Thursday');
      expect(result).toContain('2:30 PM');
    });

    it('should show day name for 6 days ago', () => {
      const sixDaysAgo = new Date('2025-10-20T14:30:00'); // Monday
      const result = formatMessageTime(sixDaysAgo);
      
      expect(result).toContain('Monday');
      expect(result).toContain('2:30 PM');
    });

    it('should not show day name for exactly 7 days ago', () => {
      const sevenDaysAgo = new Date('2025-10-19T14:30:00');
      const result = formatMessageTime(sevenDaysAgo);
      
      // Should show date, not day name
      expect(result).toContain('Oct 19');
      expect(result).not.toContain('Monday');
      expect(result).not.toContain('Tuesday');
      expect(result).not.toContain('Sunday');
    });
  });

  describe('Older Messages (7+ days ago)', () => {
    it('should show full date for 7 days ago', () => {
      const sevenDaysAgo = new Date('2025-10-19T14:30:00');
      const result = formatMessageTime(sevenDaysAgo);
      
      expect(result).toContain('Oct 19');
      expect(result).toContain('2:30 PM');
      expect(result).not.toContain('Sunday'); // Should not show day name
    });

    it('should show full date for 30 days ago', () => {
      const thirtyDaysAgo = new Date('2025-09-26T14:30:00');
      const result = formatMessageTime(thirtyDaysAgo);
      
      expect(result).toContain('Sep 26');
      expect(result).toContain('2:30 PM');
    });

    it('should show full date for 100 days ago', () => {
      const hundredDaysAgo = new Date('2025-07-18T14:30:00');
      const result = formatMessageTime(hundredDaysAgo);
      
      expect(result).toContain('Jul 18');
      expect(result).toContain('2:30 PM');
    });
  });

  describe('Different Year', () => {
    it('should include year if message is from previous year', () => {
      const lastYear = new Date('2024-12-25T14:30:00');
      const result = formatMessageTime(lastYear);
      
      expect(result).toContain('Dec 25');
      expect(result).toContain('2024');
      expect(result).toContain('2:30 PM');
    });

    it('should include year for much older messages', () => {
      const oldMessage = new Date('2023-01-15T09:00:00');
      const result = formatMessageTime(oldMessage);
      
      expect(result).toContain('Jan 15');
      expect(result).toContain('2023');
      expect(result).toContain('9:00 AM');
    });

    it('should not include current year for recent messages', () => {
      const thisYear = new Date('2025-01-01T12:00:00');
      const result = formatMessageTime(thisYear);
      
      expect(result).toContain('Jan 1');
      expect(result).not.toContain('2025');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null or undefined gracefully', () => {
      expect(formatMessageTime(null as any)).toBe('');
      expect(formatMessageTime(undefined as any)).toBe('');
    });

    it('should handle invalid date', () => {
      const invalidDate = new Date('invalid');
      const result = formatMessageTime(invalidDate);
      
      // Invalid dates return "Invalid Date" string
      expect(result).toContain('Invalid Date');
    });

    it('should handle message at exact boundary (midnight)', () => {
      const yesterdayMidnight = new Date('2025-10-25T00:00:00');
      const result = formatMessageTime(yesterdayMidnight);
      
      expect(result).toContain('Yesterday');
      expect(result).toContain('12:00 AM');
    });

    it('should handle message at day boundary (11:59 PM)', () => {
      const almostMidnight = new Date('2025-10-25T23:59:00');
      const result = formatMessageTime(almostMidnight);
      
      expect(result).toContain('Yesterday');
      expect(result).toContain('11:59 PM');
    });
  });

  describe('Consistency Across Formats', () => {
    it('should always include time component', () => {
      const testDates = [
        new Date('2025-10-26T14:30:00'), // Today
        new Date('2025-10-25T14:30:00'), // Yesterday
        new Date('2025-10-20T14:30:00'), // 6 days ago
        new Date('2025-10-10T14:30:00'), // 16 days ago
        new Date('2024-12-25T14:30:00'), // Different year
      ];

      testDates.forEach(date => {
        const result = formatMessageTime(date);
        // Should always contain time in format like "2:30 PM"
        expect(result).toMatch(/\d{1,2}:\d{2}\s[AP]M/);
      });
    });

    it('should format consistently within same day', () => {
      const morning = formatMessageTime(new Date('2025-10-26T09:00:00'));
      const evening = formatMessageTime(new Date('2025-10-26T21:00:00'));

      // Both should be time-only (no date prefix)
      expect(morning).not.toContain(',');
      expect(evening).not.toContain(',');
      expect(morning).not.toContain('Oct');
      expect(evening).not.toContain('Oct');
    });
  });

  describe('Localization Format', () => {
    it('should use 12-hour format with AM/PM', () => {
      const morning = formatMessageTime(new Date('2025-10-26T08:30:00'));
      const afternoon = formatMessageTime(new Date('2025-10-26T16:45:00'));

      expect(morning).toContain('AM');
      expect(afternoon).toContain('PM');
      
      // Should not be 24-hour format
      expect(morning).not.toContain('08:30');
      expect(afternoon).not.toContain('16:45');
    });

    it('should use short month format', () => {
      const dates = [
        { date: new Date('2025-01-15T14:30:00'), expected: 'Jan' },
        { date: new Date('2025-02-15T14:30:00'), expected: 'Feb' },
        { date: new Date('2025-12-15T14:30:00'), expected: 'Dec' },
      ];

      dates.forEach(({ date, expected }) => {
        const result = formatMessageTime(date);
        expect(result).toContain(expected);
      });
    });
  });
});

