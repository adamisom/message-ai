/**
 * Rate Limiting Integration Tests
 * 
 * Tests the rate limiting logic against a real Firebase emulator.
 * These tests verify that:
 * - Concurrent requests are handled correctly
 * - Hourly limits are enforced
 * - Monthly limits are enforced
 * - Hour resets work correctly
 */

import { checkAIRateLimit } from '../../utils/rateLimit';
import { db, clearFirestore, createTestUser } from './setup';

describe('Rate Limiting Integration Tests', () => {
  const testUserId = 'test-user-rate-limit';

  beforeAll(async () => {
    await createTestUser(testUserId, 'ratelimit@test.com', 'Rate Limit User');
  });

  beforeEach(async () => {
    // Clear rate limit data before each test
    const month = new Date().toISOString().slice(0, 7);
    const usageRef = db.doc(`users/${testUserId}/ai_usage/${month}`);
    await usageRef.delete();
  });

  afterAll(async () => {
    await clearFirestore();
  });

  describe('First action this month', () => {
    it('should allow action and create usage document', async () => {
      const result = await checkAIRateLimit(testUserId, 'search');

      expect(result).toBe(true);

      // Verify document was created
      const month = new Date().toISOString().slice(0, 7);
      const usageDoc = await db
        .doc(`users/${testUserId}/ai_usage/${month}`)
        .get();

      expect(usageDoc.exists).toBe(true);
      const data = usageDoc.data()!;
      expect(data.totalActions).toBe(1);
      expect(data.searchCalls).toBe(1);
      expect(data.actionsThisHour).toBe(1);
    });
  });

  describe('Concurrent requests', () => {
    it('should handle 10 concurrent requests correctly', async () => {
      // Fire 10 concurrent requests
      const promises = Array(10)
        .fill(null)
        .map(() => checkAIRateLimit(testUserId, 'search'));

      const results = await Promise.all(promises);

      // All should succeed (under limit)
      expect(results.every((r) => r === true)).toBe(true);

      // Verify counter is exactly 10 (not 1, not 100)
      const month = new Date().toISOString().slice(0, 7);
      const usageDoc = await db
        .doc(`users/${testUserId}/ai_usage/${month}`)
        .get();

      const data = usageDoc.data()!;
      expect(data.totalActions).toBe(10);
      expect(data.actionsThisHour).toBe(10);
    });
  });

  describe('Hourly limit enforcement', () => {
    it('should deny action when hourly limit is reached', async () => {
      const month = new Date().toISOString().slice(0, 7);

      // Set up user at hourly limit (50 actions)
      await db.doc(`users/${testUserId}/ai_usage/${month}`).set({
        month,
        totalActions: 50,
        searchCalls: 50,
        actionsThisHour: 50,
        hourStartedAt: new Date(), // Within the hour
        lastUpdated: new Date(),
      });

      // Try one more action
      const result = await checkAIRateLimit(testUserId, 'search');

      expect(result).toBe(false);

      // Verify counter didn't increment
      const usageDoc = await db
        .doc(`users/${testUserId}/ai_usage/${month}`)
        .get();
      const data = usageDoc.data()!;
      expect(data.totalActions).toBe(50); // Still 50
    });

    it('should allow action just under hourly limit', async () => {
      const month = new Date().toISOString().slice(0, 7);

      // Set up user at 49 actions (one under limit)
      await db.doc(`users/${testUserId}/ai_usage/${month}`).set({
        month,
        totalActions: 49,
        searchCalls: 49,
        actionsThisHour: 49,
        hourStartedAt: new Date(),
        lastUpdated: new Date(),
      });

      // Try one more action
      const result = await checkAIRateLimit(testUserId, 'search');

      expect(result).toBe(true);

      // Verify counter incremented to 50
      const usageDoc = await db
        .doc(`users/${testUserId}/ai_usage/${month}`)
        .get();
      const data = usageDoc.data()!;
      expect(data.totalActions).toBe(50);
      expect(data.actionsThisHour).toBe(50);
    });
  });

  describe('Monthly limit enforcement', () => {
    it('should deny action when monthly limit is reached', async () => {
      const month = new Date().toISOString().slice(0, 7);

      // Set up user at monthly limit (1000 actions)
      await db.doc(`users/${testUserId}/ai_usage/${month}`).set({
        month,
        totalActions: 1000,
        searchCalls: 500,
        actionsThisHour: 10,
        hourStartedAt: new Date(),
        lastUpdated: new Date(),
      });

      // Try one more action
      const result = await checkAIRateLimit(testUserId, 'search');

      expect(result).toBe(false);

      // Verify counter didn't increment
      const usageDoc = await db
        .doc(`users/${testUserId}/ai_usage/${month}`)
        .get();
      const data = usageDoc.data()!;
      expect(data.totalActions).toBe(1000);
    });
  });

  describe('Hourly reset', () => {
    it('should reset hourly counter after 1 hour', async () => {
      const month = new Date().toISOString().slice(0, 7);
      const twoHoursAgo = new Date(Date.now() - 7200000); // 2 hours ago

      // Set up user with old hour (was at limit)
      await db.doc(`users/${testUserId}/ai_usage/${month}`).set({
        month,
        totalActions: 100,
        searchCalls: 50,
        actionsThisHour: 50, // Was at hourly limit
        hourStartedAt: twoHoursAgo, // 2 hours ago
        lastUpdated: twoHoursAgo,
      });

      // Try action (should succeed - new hour)
      const result = await checkAIRateLimit(testUserId, 'search');

      expect(result).toBe(true);

      // Verify hourly counter was reset to 1
      const usageDoc = await db
        .doc(`users/${testUserId}/ai_usage/${month}`)
        .get();
      const data = usageDoc.data()!;
      expect(data.totalActions).toBe(101); // Monthly incremented
      expect(data.actionsThisHour).toBe(1); // Hourly reset to 1
    });

    it('should not reset if within the hour', async () => {
      const month = new Date().toISOString().slice(0, 7);
      const thirtyMinutesAgo = new Date(Date.now() - 1800000); // 30 min ago

      // Set up user with recent hour
      await db.doc(`users/${testUserId}/ai_usage/${month}`).set({
        month,
        totalActions: 25,
        searchCalls: 25,
        actionsThisHour: 25,
        hourStartedAt: thirtyMinutesAgo,
        lastUpdated: thirtyMinutesAgo,
      });

      // Try action
      const result = await checkAIRateLimit(testUserId, 'search');

      expect(result).toBe(true);

      // Verify hourly counter incremented (not reset)
      const usageDoc = await db
        .doc(`users/${testUserId}/ai_usage/${month}`)
        .get();
      const data = usageDoc.data()!;
      expect(data.actionsThisHour).toBe(26); // Incremented, not reset
    });
  });

  describe('Feature-specific counters', () => {
    it('should track different features separately', async () => {
      // Call different features
      await checkAIRateLimit(testUserId, 'search');
      await checkAIRateLimit(testUserId, 'search');
      await checkAIRateLimit(testUserId, 'summary');
      await checkAIRateLimit(testUserId, 'actionItems');

      const month = new Date().toISOString().slice(0, 7);
      const usageDoc = await db
        .doc(`users/${testUserId}/ai_usage/${month}`)
        .get();

      const data = usageDoc.data()!;
      expect(data.totalActions).toBe(4);
      expect(data.searchCalls).toBe(2);
      expect(data.summaryCalls).toBe(1);
      expect(data.actionItemsCalls).toBe(1);
    });
  });
});

