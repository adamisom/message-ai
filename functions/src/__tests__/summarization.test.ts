// DEPRECATED: This test file tested manual JSON parsing which is no longer used.
// All Claude-based features now use Anthropic's Tool Use API for structured outputs.
// The Tool Use API guarantees valid JSON structure server-side, eliminating the need
// for manual parsing and validation logic that these tests covered.
//
// For integration tests of the actual AI features, see:
// - functions/src/__tests__/integration/*.integration.test.ts
//
// High-value logic tests (assignee resolution, confidence filtering, etc.) remain
// in actionItems.test.ts and decisions.test.ts.

describe('Thread Summarization (DEPRECATED)', () => {
  it('placeholder - tests deprecated after Tool Use refactoring', () => {
    expect(true).toBe(true);
  });
});

