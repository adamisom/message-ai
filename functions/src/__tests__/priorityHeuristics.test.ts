import {quickPriorityCheck} from '../utils/priorityHeuristics';

describe('Priority Heuristics', () => {
  describe('High priority detection', () => {
    it('should detect urgent keywords', () => {
      expect(quickPriorityCheck('URGENT: Please review')).toBe('high');
      expect(quickPriorityCheck('Need this ASAP!')).toBe('high');
      expect(quickPriorityCheck('EMERGENCY meeting')).toBe('high');
      expect(quickPriorityCheck('This is critical')).toBe('high');
    });

    it('should detect multiple exclamation marks', () => {
      expect(quickPriorityCheck('Server is down!!!')).toBe('high');
      expect(quickPriorityCheck('Help needed???')).toBe('high');
    });

    it('should detect all caps', () => {
      expect(quickPriorityCheck('ATTENTION TEAM LEADERS')).toBe('high');
      expect(quickPriorityCheck('IMMEDIATE ACTION REQUIRED')).toBe('high');
    });
  });

  describe('Low priority detection', () => {
    it('should detect casual messages', () => {
      expect(quickPriorityCheck('lol')).toBe('low');
      expect(quickPriorityCheck('okay')).toBe('low');
      expect(quickPriorityCheck('thanks')).toBe('low');
      expect(quickPriorityCheck('nice')).toBe('low');
    });

    it('should detect short greetings', () => {
      expect(quickPriorityCheck('good night')).toBe('low');
      expect(quickPriorityCheck('bye')).toBe('low');
      expect(quickPriorityCheck('see you')).toBe('low');
    });

    it('should detect emoji-only messages', () => {
      expect(quickPriorityCheck('😊')).toBe('low');
      expect(quickPriorityCheck('👍')).toBe('low');
    });
  });

  describe('Unknown priority', () => {
    it('should return unknown for normal messages', () => {
      expect(quickPriorityCheck('Let me review and get back to you tomorrow')).toBe('unknown');
      expect(
        quickPriorityCheck('Meeting at 3pm today to discuss project timeline')
      ).toBe('unknown');
      expect(
        quickPriorityCheck('Can you send me the updated document when ready?')
      ).toBe('unknown');
    });

    it('should return low for short normal messages', () => {
      expect(quickPriorityCheck('Got it')).toBe('low');
      expect(quickPriorityCheck('Will do')).toBe('low');
    });
  });

  describe('Edge cases', () => {
    it('should handle mixed case urgent keywords', () => {
      expect(quickPriorityCheck('This is Urgent please')).toBe('high');
      expect(quickPriorityCheck('asap need this done')).toBe('high');
    });

    it('should not flag short all-caps as high priority', () => {
      expect(quickPriorityCheck('OK')).toBe('low');
      expect(quickPriorityCheck('YES')).toBe('low');
    });
  });
});

