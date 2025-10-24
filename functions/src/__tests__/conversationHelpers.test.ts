import {
  extractJsonFromAIResponse,
  formatParticipantsForPrompt,
} from '../utils/conversationHelpers';

describe('extractJsonFromAIResponse', () => {
  describe('Valid JSON extraction', () => {
    it('should parse plain JSON array', () => {
      const response = '[{"text": "Item 1"}, {"text": "Item 2"}]';
      const result = extractJsonFromAIResponse<any[]>(response);

      expect(result).toEqual([{text: 'Item 1'}, {text: 'Item 2'}]);
    });

    it('should parse plain JSON object', () => {
      const response = '{"summary": "Test summary", "count": 5}';
      const result = extractJsonFromAIResponse<any>(response);

      expect(result).toEqual({summary: 'Test summary', count: 5});
    });

    it('should extract JSON from markdown code block with "json" tag', () => {
      const response = '```json\n[{"id": 1}, {"id": 2}]\n```';
      const result = extractJsonFromAIResponse<any[]>(response);

      expect(result).toEqual([{id: 1}, {id: 2}]);
    });

    it('should extract JSON from markdown code block without language tag', () => {
      const response = '```\n{"data": "value"}\n```';
      const result = extractJsonFromAIResponse<any>(response);

      expect(result).toEqual({data: 'value'});
    });

    it('should extract JSON from markdown with uppercase JSON tag', () => {
      const response = '```JSON\n[1, 2, 3]\n```';
      const result = extractJsonFromAIResponse<number[]>(response);

      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle text before and after JSON', () => {
      const response = `Here's the result:
\`\`\`json
[{"status": "success"}]
\`\`\`
Hope this helps!`;
      const result = extractJsonFromAIResponse<any[]>(response);

      expect(result).toEqual([{status: 'success'}]);
    });

    it('should handle JSON with nested braces in strings', () => {
      const response = '{"text": "Hello {world}", "note": "Use {brackets}"}';
      const result = extractJsonFromAIResponse<any>(response);

      expect(result).toEqual({
        text: 'Hello {world}',
        note: 'Use {brackets}',
      });
    });

    it('should handle whitespace around JSON', () => {
      const response = '  \n  [{"id": 1}]  \n  ';
      const result = extractJsonFromAIResponse<any[]>(response);

      expect(result).toEqual([{id: 1}]);
    });

    it('should handle JSON with spaces in markdown', () => {
      const response = '``` json\n{"key": "value"}\n```';
      const result = extractJsonFromAIResponse<any>(response);

      expect(result).toEqual({key: 'value'});
    });

    it('should extract array nested in object', () => {
      const response = '{"items": [1, 2, 3], "total": 3}';
      const result = extractJsonFromAIResponse<any>(response);

      expect(result).toEqual({items: [1, 2, 3], total: 3});
    });
  });

  describe('Invalid JSON handling', () => {
    it('should throw error for invalid JSON', () => {
      const response = '[invalid json}';

      expect(() => extractJsonFromAIResponse(response)).toThrow();
    });

    it('should throw error for empty string', () => {
      const response = '';

      expect(() => extractJsonFromAIResponse(response)).toThrow();
    });

    it('should throw error for text without JSON', () => {
      const response = 'This is just plain text without any JSON';

      expect(() => extractJsonFromAIResponse(response)).toThrow();
    });

    it('should throw error for incomplete JSON', () => {
      const response = '{"key": "value"';

      expect(() => extractJsonFromAIResponse(response)).toThrow();
    });

    it('should throw error for mismatched braces', () => {
      const response = '[{"key": "value"}]]';

      expect(() => extractJsonFromAIResponse(response)).toThrow();
    });
  });
});

describe('formatParticipantsForPrompt', () => {
  describe('Valid participant formatting', () => {
    it('should format participants with email', () => {
      const participants = {
        uid1: {displayName: 'Alice Johnson', email: 'alice@example.com'},
        uid2: {displayName: 'Bob Smith', email: 'bob@example.com'},
      };

      const result = formatParticipantsForPrompt(participants);

      expect(result).toBe(
        '- Alice Johnson (alice@example.com)\n- Bob Smith (bob@example.com)'
      );
    });

    it('should format participants without email', () => {
      const participants = {
        uid1: {displayName: 'Alice Johnson', email: ''},
        uid2: {displayName: 'Bob Smith'},
      };

      const result = formatParticipantsForPrompt(participants);

      expect(result).toBe('- Alice Johnson\n- Bob Smith');
    });

    it('should format mix of participants with and without email', () => {
      const participants = {
        uid1: {displayName: 'Alice Johnson', email: 'alice@example.com'},
        uid2: {displayName: 'Bob Smith'},
        uid3: {displayName: 'Charlie', email: ''},
      };

      const result = formatParticipantsForPrompt(participants);

      expect(result).toBe(
        '- Alice Johnson (alice@example.com)\n- Bob Smith\n- Charlie'
      );
    });

    it('should use "Unknown" for missing displayName', () => {
      const participants = {
        uid1: {email: 'alice@example.com'},
        uid2: {displayName: 'Bob', email: 'bob@example.com'},
      };

      const result = formatParticipantsForPrompt(participants);

      expect(result).toBe(
        '- Unknown (alice@example.com)\n- Bob (bob@example.com)'
      );
    });

    it('should handle single participant', () => {
      const participants = {
        uid1: {displayName: 'Alice', email: 'alice@example.com'},
      };

      const result = formatParticipantsForPrompt(participants);

      expect(result).toBe('- Alice (alice@example.com)');
    });
  });

  describe('Edge cases and invalid input', () => {
    it('should return fallback message for undefined', () => {
      const result = formatParticipantsForPrompt(undefined);

      expect(result).toBe('No participants found');
    });

    it('should return fallback message for null', () => {
      const result = formatParticipantsForPrompt(null);

      expect(result).toBe('No participants found');
    });

    it('should return fallback message for empty object', () => {
      const result = formatParticipantsForPrompt({});

      expect(result).toBe('No participants found');
    });

    it('should return fallback message for non-object', () => {
      const result = formatParticipantsForPrompt('not an object');

      expect(result).toBe('No participants found');
    });

    it('should return fallback message for array', () => {
      const result = formatParticipantsForPrompt([]);

      expect(result).toBe('No participants found');
    });

    it('should handle participant with null displayName', () => {
      const participants = {
        uid1: {displayName: null, email: 'alice@example.com'},
      };

      const result = formatParticipantsForPrompt(participants);

      expect(result).toBe('- Unknown (alice@example.com)');
    });

    it('should handle participant with undefined displayName and email', () => {
      const participants = {
        uid1: {},
      };

      const result = formatParticipantsForPrompt(participants);

      expect(result).toBe('- Unknown');
    });

    it('should handle participant details that are null', () => {
      const participants = {
        uid1: null,
        uid2: {displayName: 'Bob', email: 'bob@example.com'},
      };

      const result = formatParticipantsForPrompt(participants);

      expect(result).toBe('- Unknown\n- Bob (bob@example.com)');
    });
  });
});

