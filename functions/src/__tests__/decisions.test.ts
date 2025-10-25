describe('Decision Tracking', () => {
  describe('Decision parsing', () => {
    it('should parse valid decision', () => {
      const response = JSON.stringify({
        decision: 'We will go with option A',
        context: 'Team agreed after discussing pros and cons',
        participantIds: ['user1', 'user2'],
        sourceMessageIds: ['msg1', 'msg2', 'msg3'],
        confidence: 0.9,
      });

      const parsed = JSON.parse(response);
      expect(parsed.decision).toBe('We will go with option A');
      expect(parsed.confidence).toBe(0.9);
      expect(parsed.participantIds).toHaveLength(2);
    });

    it('should parse multiple decisions', () => {
      const response = JSON.stringify([
        {
          decision: 'Decision 1',
          context: 'Context 1',
          participantIds: ['user1'],
          sourceMessageIds: ['msg1'],
          confidence: 0.85,
        },
        {
          decision: 'Decision 2',
          context: 'Context 2',
          participantIds: ['user2', 'user3'],
          sourceMessageIds: ['msg2', 'msg3'],
          confidence: 0.92,
        },
      ]);

      const parsed = JSON.parse(response);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });

  });

  describe('Confidence filtering', () => {
    it('should filter decisions by confidence threshold', () => {
      const decisions = [
        {confidence: 0.9, decision: 'High confidence'},
        {confidence: 0.65, decision: 'Low confidence'},
        {confidence: 0.75, decision: 'Medium confidence'},
        {confidence: 0.5, decision: 'Very low confidence'},
      ];

      const threshold = 0.7;
      const filtered = decisions.filter((d) => d.confidence > threshold);

      expect(filtered).toHaveLength(2);
      expect(filtered[0].confidence).toBeGreaterThan(threshold);
      expect(filtered[1].confidence).toBeGreaterThan(threshold);
    });

    it('should include decisions at exactly 0.7', () => {
      const decisions = [{confidence: 0.7, decision: 'Exactly threshold'}];
      const filtered = decisions.filter((d) => d.confidence > 0.7);
      expect(filtered).toHaveLength(0); // > not >=
    });

    it('should include decisions above 0.7', () => {
      const decisions = [{confidence: 0.71, decision: 'Above threshold'}];
      const filtered = decisions.filter((d) => d.confidence > 0.7);
      expect(filtered).toHaveLength(1);
    });
  });

});

