import {parseAIResponse, SummarySchema} from '../utils/validation';

describe('Thread Summarization', () => {
  describe('Summary validation', () => {
    it('should parse and validate valid summary response', () => {
      const mockResponse = JSON.stringify({
        summary: 'Team discussed project timeline and budget allocation',
        keyPoints: [
          'Meeting scheduled for 3pm',
          'Budget approved by management',
          'Next steps defined',
        ],
      });

      const parsed = parseAIResponse(mockResponse, SummarySchema);
      expect(parsed.summary).toBeTruthy();
      expect(parsed.keyPoints).toHaveLength(3);
    });

    it('should reject summary with too few key points', () => {
      const invalidResponse = JSON.stringify({
        summary: 'Team discussed various topics',
        keyPoints: ['One point', 'Two points'], // Less than 3
      });

      expect(() => {
        parseAIResponse(invalidResponse, SummarySchema);
      }).toThrow();
    });

    it('should reject summary that is too short', () => {
      const invalidResponse = JSON.stringify({
        summary: 'Too short', // Less than 10 chars
        keyPoints: ['Point 1', 'Point 2', 'Point 3'],
      });

      expect(() => {
        parseAIResponse(invalidResponse, SummarySchema);
      }).toThrow();
    });

    it('should handle summary in markdown code block', () => {
      const markdownResponse = `\`\`\`json
{
  "summary": "Team successfully completed the project planning phase",
  "keyPoints": ["Timeline set", "Budget approved", "Team aligned"]
}
\`\`\``;

      const parsed = parseAIResponse(markdownResponse, SummarySchema);
      expect(parsed.summary).toBeTruthy();
      expect(parsed.keyPoints).toHaveLength(3);
    });
  });
});

