import { Message } from '../../types';

// Helper to deduplicate messages by ID
const deduplicateMessages = (messages: Message[]): Message[] => {
  const seen = new Set<string>();
  return messages.filter(msg => {
    if (seen.has(msg.id)) {
      return false;
    }
    seen.add(msg.id);
    return true;
  });
};

describe('Pagination Logic - Inverted List', () => {
  const createMessage = (id: string, timestamp: Date): Message => ({
    id,
    text: `Message ${id}`,
    senderId: 'user1',
    senderName: 'Test User',
    createdAt: timestamp,
    participants: ['user1'],
  });

  describe('Message Array Merging', () => {
    it('should append older messages to end of array (inverted list)', () => {
      // Existing messages (newest first)
      const existingMessages: Message[] = [
        createMessage('100', new Date('2025-10-26T15:00:00')), // Newest
        createMessage('99', new Date('2025-10-26T14:00:00')),
      ];

      // Paginated older messages (also in DESC order)
      const olderMessages: Message[] = [
        createMessage('98', new Date('2025-10-26T13:00:00')),
        createMessage('97', new Date('2025-10-26T12:00:00')), // Oldest
      ];

      // Simulate pagination merge
      const combined = [...existingMessages, ...olderMessages];

      // Verify: newest still at index 0, oldest at end
      expect(combined[0].id).toBe('100');
      expect(combined[combined.length - 1].id).toBe('97');
      expect(combined).toHaveLength(4);
      
      // Verify chronological DESC order maintained
      expect(combined.map(m => m.id)).toEqual(['100', '99', '98', '97']);
    });

    it('should prepend new messages to beginning of array (inverted list)', () => {
      // Existing messages
      const existingMessages: Message[] = [
        createMessage('2', new Date('2025-10-26T14:00:00')),
        createMessage('1', new Date('2025-10-26T13:00:00')),
      ];

      // New messages from real-time listener
      const newMessages: Message[] = [
        createMessage('3', new Date('2025-10-26T15:00:00')),
      ];

      // Simulate new message merge
      const combined = [...newMessages, ...existingMessages];

      // Verify: new message at index 0
      expect(combined[0].id).toBe('3');
      expect(combined).toHaveLength(3);
      expect(combined.map(m => m.id)).toEqual(['3', '2', '1']);
    });

    it('should handle multiple pagination cycles correctly', () => {
      // Start with initial 100 messages (1500-1401)
      let messages: Message[] = [];
      for (let i = 1500; i > 1400; i--) {
        messages.push(createMessage(String(i), new Date(`2025-10-${i % 26 + 1}T15:00:00`)));
      }

      expect(messages[0].id).toBe('1500'); // Newest
      expect(messages[messages.length - 1].id).toBe('1401'); // Oldest in initial load

      // First pagination (1400-1301)
      const batch1: Message[] = [];
      for (let i = 1400; i > 1300; i--) {
        batch1.push(createMessage(String(i), new Date(`2025-10-${i % 26 + 1}T14:00:00`)));
      }
      messages = [...messages, ...batch1];

      expect(messages[0].id).toBe('1500');
      expect(messages[messages.length - 1].id).toBe('1301');
      expect(messages).toHaveLength(200);

      // Second pagination (1300-1201)
      const batch2: Message[] = [];
      for (let i = 1300; i > 1200; i--) {
        batch2.push(createMessage(String(i), new Date(`2025-10-${i % 26 + 1}T13:00:00`)));
      }
      messages = [...messages, ...batch2];

      expect(messages[0].id).toBe('1500'); // Still newest
      expect(messages[messages.length - 1].id).toBe('1201'); // Now oldest
      expect(messages).toHaveLength(300);
    });
  });

  describe('Message Deduplication', () => {
    it('should remove duplicate messages by ID', () => {
      const messages: Message[] = [
        createMessage('1', new Date('2025-10-26T15:00:00')),
        createMessage('2', new Date('2025-10-26T14:00:00')),
        createMessage('1', new Date('2025-10-26T15:00:00')), // Duplicate
      ];

      const deduped = deduplicateMessages(messages);

      expect(deduped).toHaveLength(2);
      expect(deduped.map(m => m.id)).toEqual(['1', '2']);
    });

    it('should keep first occurrence when deduplicating', () => {
      const messages: Message[] = [
        createMessage('1', new Date('2025-10-26T15:00:00')),
        createMessage('2', new Date('2025-10-26T14:00:00')),
        createMessage('1', new Date('2025-10-26T15:00:00')), // Duplicate
        createMessage('3', new Date('2025-10-26T13:00:00')),
      ];

      const deduped = deduplicateMessages(messages);

      expect(deduped).toHaveLength(3);
      // First '1' is kept, second '1' is removed
      expect(deduped.map(m => m.id)).toEqual(['1', '2', '3']);
    });

    it('should handle array with no duplicates', () => {
      const messages: Message[] = [
        createMessage('1', new Date('2025-10-26T15:00:00')),
        createMessage('2', new Date('2025-10-26T14:00:00')),
        createMessage('3', new Date('2025-10-26T13:00:00')),
      ];

      const deduped = deduplicateMessages(messages);

      expect(deduped).toHaveLength(3);
      expect(deduped).toEqual(messages);
    });

    it('should handle array with all duplicates', () => {
      const messages: Message[] = [
        createMessage('1', new Date('2025-10-26T15:00:00')),
        createMessage('1', new Date('2025-10-26T15:00:00')),
        createMessage('1', new Date('2025-10-26T15:00:00')),
      ];

      const deduped = deduplicateMessages(messages);

      expect(deduped).toHaveLength(1);
      expect(deduped[0].id).toBe('1');
    });

    it('should handle empty array', () => {
      const messages: Message[] = [];
      const deduped = deduplicateMessages(messages);

      expect(deduped).toHaveLength(0);
      expect(deduped).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle pagination with no overlap', () => {
      const existingMessages: Message[] = [
        createMessage('100', new Date('2025-10-26T15:00:00')),
        createMessage('99', new Date('2025-10-26T14:00:00')),
      ];

      const olderMessages: Message[] = [
        createMessage('98', new Date('2025-10-26T13:00:00')),
        createMessage('97', new Date('2025-10-26T12:00:00')),
      ];

      const combined = [...existingMessages, ...olderMessages];
      const deduped = deduplicateMessages(combined);

      expect(deduped).toHaveLength(4);
      expect(deduped.map(m => m.id)).toEqual(['100', '99', '98', '97']);
    });

    it('should handle pagination with overlap (race condition)', () => {
      const existingMessages: Message[] = [
        createMessage('100', new Date('2025-10-26T15:00:00')),
        createMessage('99', new Date('2025-10-26T14:00:00')),
      ];

      // Pagination might include message '99' again due to race condition
      const olderMessages: Message[] = [
        createMessage('99', new Date('2025-10-26T14:00:00')), // Duplicate
        createMessage('98', new Date('2025-10-26T13:00:00')),
      ];

      const combined = [...existingMessages, ...olderMessages];
      const deduped = deduplicateMessages(combined);

      // Should remove duplicate
      expect(deduped).toHaveLength(3);
      expect(deduped.map(m => m.id)).toEqual(['100', '99', '98']);
    });

    it('should handle prepending and appending in same session', () => {
      // Start with middle range
      let messages: Message[] = [
        createMessage('100', new Date('2025-10-26T15:00:00')),
        createMessage('99', new Date('2025-10-26T14:00:00')),
      ];

      // Paginate older (append)
      const older = [createMessage('98', new Date('2025-10-26T13:00:00'))];
      messages = [...messages, ...older];

      // New message arrives (prepend)
      const newer = [createMessage('101', new Date('2025-10-26T16:00:00'))];
      messages = [...newer, ...messages];

      expect(messages[0].id).toBe('101'); // Newest
      expect(messages[messages.length - 1].id).toBe('98'); // Oldest
      expect(messages).toHaveLength(4);
    });
  });

  describe('Array Order Validation', () => {
    it('should maintain DESC chronological order after pagination', () => {
      const messages: Message[] = [
        createMessage('3', new Date('2025-10-26T15:00:00')),
        createMessage('2', new Date('2025-10-26T14:00:00')),
      ];

      const older: Message[] = [
        createMessage('1', new Date('2025-10-26T13:00:00')),
      ];

      const combined = [...messages, ...older];

      // Verify timestamps are in descending order
      for (let i = 0; i < combined.length - 1; i++) {
        const current = combined[i].createdAt as Date;
        const next = combined[i + 1].createdAt as Date;
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });
  });
});

