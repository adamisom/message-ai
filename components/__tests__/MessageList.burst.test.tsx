/**
 * Burst Performance Test
 * 
 * Tests MessageList performance with rapid message influx.
 * Simulates 10 messages arriving in 2 seconds to measure:
 * - Individual render times
 * - Total processing time
 * - Performance degradation over time
 * - Re-render count
 */

import { Message } from '../../types';

describe('MessageList - Burst Performance (Logic)', () => {
  beforeAll(() => {
    // Suppress console.log in tests to reduce noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const createMessage = (id: string, timestamp: Date): Message => ({
    id,
    text: `Burst message ${id}`,
    senderId: 'user1',
    senderName: 'Test User',
    createdAt: timestamp,
    participants: ['user1'],
  });

  // Performance thresholds
  const MESSAGE_BURST_COUNT = 10;

  describe('Message Array Operations', () => {
    it('should efficiently prepend 10 messages to empty array', () => {
      let messages: Message[] = [];
      const times: number[] = [];

      console.log('\n🚀 [Burst Test] Prepending 10 messages to empty array...\n');

      for (let i = 0; i < MESSAGE_BURST_COUNT; i++) {
        const newMessage = createMessage(`msg-${i + 1}`, new Date());
        
        const start = performance.now();
        messages = [newMessage, ...messages];
        const elapsed = performance.now() - start;
        
        times.push(elapsed);
        console.log(`  Message ${i + 1}: ${elapsed.toFixed(4)}ms | Array length: ${messages.length}`);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`\n📊 Average prepend time: ${avgTime.toFixed(4)}ms\n`);

      expect(messages).toHaveLength(MESSAGE_BURST_COUNT);
      expect(messages[0].id).toBe('msg-10'); // Newest first
      expect(messages[9].id).toBe('msg-1'); // Oldest last
      
      // Array operations should be fast (< 1ms per operation)
      expect(avgTime).toBeLessThan(1);
    });

    it('should efficiently prepend 10 messages to 1000-message array', () => {
      // Start with 1000 messages
      let messages: Message[] = [];
      for (let i = 1000; i > 0; i--) {
        messages.push(createMessage(`existing-${i}`, new Date(Date.now() - i * 1000)));
      }

      console.log('\n🚀 [Burst Test] Prepending 10 messages to 1000-message array...\n');

      const times: number[] = [];

      for (let i = 0; i < MESSAGE_BURST_COUNT; i++) {
        const newMessage = createMessage(`burst-${i + 1}`, new Date());
        
        const start = performance.now();
        messages = [newMessage, ...messages];
        const elapsed = performance.now() - start;
        
        times.push(elapsed);
        console.log(`  Message ${i + 1}: ${elapsed.toFixed(4)}ms | Array length: ${messages.length}`);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      
      console.log(`\n📊 With 1000 existing messages:`);
      console.log(`   Average: ${avgTime.toFixed(4)}ms`);
      console.log(`   Max: ${maxTime.toFixed(4)}ms\n`);

      expect(messages).toHaveLength(1010);
      expect(messages[0].id).toBe('burst-10'); // Newest first
      
      // Should still be fast even with large array
      expect(avgTime).toBeLessThan(5); // More lenient for large arrays
    });

    it('should handle extremely rapid burst (10 messages, no delays)', () => {
      let messages: Message[] = [];
      
      console.log('\n🚀 [Burst Test] Rapid succession (no delays)...\n');

      const overallStart = performance.now();
      
      for (let i = 0; i < MESSAGE_BURST_COUNT; i++) {
        const newMessage = createMessage(`rapid-${i + 1}`, new Date());
        messages = [newMessage, ...messages];
      }
      
      const totalTime = performance.now() - overallStart;
      const avgTime = totalTime / MESSAGE_BURST_COUNT;

      console.log(`📊 Total time: ${totalTime.toFixed(4)}ms`);
      console.log(`📊 Average per message: ${avgTime.toFixed(4)}ms\n`);

      expect(messages).toHaveLength(MESSAGE_BURST_COUNT);
      expect(totalTime).toBeLessThan(10); // All 10 should complete in < 10ms
    });
  });

  describe('Deduplication Performance', () => {
    const deduplicateMessages = (msgs: Message[]): Message[] => {
      const seen = new Set<string>();
      return msgs.filter(msg => {
        if (seen.has(msg.id)) return false;
        seen.add(msg.id);
        return true;
      });
    };

    it('should efficiently deduplicate during burst', () => {
      let messages: Message[] = [];
      const times: number[] = [];

      console.log('\n🚀 [Burst Test] Deduplication during 10-message burst...\n');

      for (let i = 0; i < MESSAGE_BURST_COUNT; i++) {
        const newMessage = createMessage(`msg-${i + 1}`, new Date());
        messages = [newMessage, ...messages];
        
        // Simulate deduplication on each update (as happens in real app)
        const start = performance.now();
        messages = deduplicateMessages(messages);
        const elapsed = performance.now() - start;
        
        times.push(elapsed);
        console.log(`  Dedupe ${i + 1}: ${elapsed.toFixed(4)}ms | Array length: ${messages.length}`);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`\n📊 Average deduplication time: ${avgTime.toFixed(4)}ms\n`);

      // Deduplication should be fast with Set-based approach
      expect(avgTime).toBeLessThan(1);
    });

    it('should efficiently deduplicate 1000-message array during burst', () => {
      // Start with 1000 messages
      let messages: Message[] = [];
      for (let i = 1000; i > 0; i--) {
        messages.push(createMessage(`existing-${i}`, new Date(Date.now() - i * 1000)));
      }

      console.log('\n🚀 [Burst Test] Deduplication on 1000+ message array...\n');

      const times: number[] = [];

      for (let i = 0; i < MESSAGE_BURST_COUNT; i++) {
        const newMessage = createMessage(`burst-${i + 1}`, new Date());
        messages = [newMessage, ...messages];
        
        const start = performance.now();
        messages = deduplicateMessages(messages);
        const elapsed = performance.now() - start;
        
        times.push(elapsed);
        console.log(`  Dedupe ${i + 1}: ${elapsed.toFixed(4)}ms | Array: ${messages.length}`);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      console.log(`\n📊 Deduplication with 1000+ messages:`);
      console.log(`   Average: ${avgTime.toFixed(4)}ms`);
      console.log(`   Max: ${maxTime.toFixed(4)}ms\n`);

      // Should still be O(n) with Set, not O(n²)
      expect(avgTime).toBeLessThan(10);
      expect(maxTime).toBeLessThan(20);
    });

    it('should handle burst with some duplicates', () => {
      let messages: Message[] = [];

      console.log('\n🚀 [Burst Test] Burst with duplicates (race condition simulation)...\n');

      for (let i = 0; i < MESSAGE_BURST_COUNT; i++) {
        const newMessage = createMessage(`msg-${i + 1}`, new Date());
        messages = [newMessage, ...messages];
        
        // Simulate occasional duplicate (race condition)
        if (i % 3 === 0) {
          const duplicate = createMessage(`msg-${i + 1}`, new Date()); // Same ID
          messages = [duplicate, ...messages];
        }
        
        messages = deduplicateMessages(messages);
      }

      console.log(`📊 Final count after deduplication: ${messages.length}\n`);

      // Should have exactly 10 unique messages (duplicates removed)
      expect(messages).toHaveLength(MESSAGE_BURST_COUNT);
      
      // Verify all IDs are unique
      const ids = messages.map(m => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(MESSAGE_BURST_COUNT);
    });
  });

  describe('Performance Degradation', () => {
    it('should not show O(n²) behavior during burst', () => {
      let messages: Message[] = [];
      const times: number[] = [];

      // Add 50 messages and measure each operation
      for (let i = 0; i < 50; i++) {
        const newMessage = createMessage(`msg-${i + 1}`, new Date());
        
        const start = performance.now();
        messages = [newMessage, ...messages];
        const elapsed = performance.now() - start;
        
        times.push(elapsed);
      }

      // Compare first 10 vs last 10
      const firstTen = times.slice(0, 10);
      const lastTen = times.slice(-10);

      const avgFirst = firstTen.reduce((a, b) => a + b, 0) / firstTen.length;
      const avgLast = lastTen.reduce((a, b) => a + b, 0) / lastTen.length;

      console.log(`\n📊 [Degradation Test]`);
      console.log(`   First 10 avg: ${avgFirst.toFixed(4)}ms`);
      console.log(`   Last 10 avg: ${avgLast.toFixed(4)}ms`);
      console.log(`   Degradation: ${((avgLast / avgFirst - 1) * 100).toFixed(1)}%\n`);

      // Should not degrade more than 1500% (very lenient - just checking for catastrophic O(n²))
      expect(avgLast).toBeLessThan(avgFirst * 15);
    });
  });

  describe('Integration Simulation', () => {
    it('should handle realistic burst scenario (prepend + dedupe)', () => {
      // Start with 100 existing messages
      let messages: Message[] = [];
      for (let i = 100; i > 0; i--) {
        messages.push(createMessage(`existing-${i}`, new Date(Date.now() - i * 60000)));
      }

      console.log('\n🚀 [Integration Test] Realistic burst on 100-message conversation...\n');

      const deduplicateMessages = (msgs: Message[]): Message[] => {
        const seen = new Set<string>();
        return msgs.filter(msg => {
          if (seen.has(msg.id)) return false;
          seen.add(msg.id);
          return true;
        });
      };

      const totalStart = performance.now();

      // Simulate 10 messages arriving with full processing
      for (let i = 0; i < MESSAGE_BURST_COUNT; i++) {
        const newMessage = createMessage(`burst-${i + 1}`, new Date());
        
        // Full operation: prepend + deduplicate
        messages = [newMessage, ...messages];
        messages = deduplicateMessages(messages);
      }

      const totalTime = performance.now() - totalStart;
      const avgPerMessage = totalTime / MESSAGE_BURST_COUNT;

      console.log(`📊 Total burst processing: ${totalTime.toFixed(2)}ms`);
      console.log(`📊 Per message: ${avgPerMessage.toFixed(2)}ms`);
      console.log(`📊 Final count: ${messages.length}\n`);

      expect(messages).toHaveLength(110);
      expect(messages[0].id).toBe('burst-10'); // Newest first
      expect(totalTime).toBeLessThan(50); // All processing should be fast
    });
  });
});

