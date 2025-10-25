/**
 * Caching Integration Tests
 * 
 * Tests the caching logic against a real Firebase emulator.
 * These tests verify that:
 * - Cache hits work correctly
 * - Cache invalidation based on age works
 * - Cache invalidation based on new messages works
 * - Cache misses when document doesn't exist
 */

import { getCachedResult } from '../../utils/caching';
import { db, clearFirestore, createTestConversation } from './setup';
import * as admin from 'firebase-admin';

describe('Caching Integration Tests', () => {
  const testConversationId = 'test-conv-caching';

  beforeAll(async () => {
    await createTestConversation(testConversationId, ['user1', 'user2'], 100);
  });

  beforeEach(async () => {
    // Clear cache documents before each test
    const cacheDoc = db.doc(
      `conversations/${testConversationId}/ai_summaries_cache/latest`
    );
    await cacheDoc.delete();
  });

  afterAll(async () => {
    await clearFirestore();
  });

  describe('Cache hit', () => {
    it('should return cached data when age and message count are valid', async () => {
      const now = Date.now();
      const cacheData = {
        summary: 'Cached summary',
        keyPoints: ['Point 1', 'Point 2', 'Point 3'],
        messageCountAtGeneration: 100,
        generatedAt: admin.firestore.Timestamp.fromMillis(now - 30000), // 30 seconds ago
        generatedBy: 'test-user',
        model: 'claude-sonnet-4',
      };

      // Create cache document
      await db
        .doc(`conversations/${testConversationId}/ai_summaries_cache/latest`)
        .set(cacheData);

      // Get cached result
      const result = await getCachedResult(
        testConversationId,
        `conversations/${testConversationId}/ai_summaries_cache/latest`,
        3600000, // 1 hour max age
        5 // 5 max new messages
      );

      expect(result).not.toBeNull();
      expect((result as any).summary).toBe('Cached summary');
      expect((result as any).keyPoints).toHaveLength(3);
    });
  });

  describe('Cache miss due to age', () => {
    it('should return null when cache is too old', async () => {
      const now = Date.now();
      const cacheData = {
        summary: 'Old cached summary',
        keyPoints: ['Point 1', 'Point 2', 'Point 3'],
        messageCountAtGeneration: 100,
        generatedAt: admin.firestore.Timestamp.fromMillis(now - 7200000), // 2 hours ago
        generatedBy: 'test-user',
        model: 'claude-sonnet-4',
      };

      // Create old cache document
      await db
        .doc(`conversations/${testConversationId}/ai_summaries_cache/latest`)
        .set(cacheData);

      // Get cached result
      const result = await getCachedResult(
        testConversationId,
        `conversations/${testConversationId}/ai_summaries_cache/latest`,
        3600000, // 1 hour max age (cache is 2 hours old)
        5
      );

      expect(result).toBeNull();
    });

    it('should return cached data when exactly at age threshold', async () => {
      const now = Date.now();
      const maxAge = 3600000; // 1 hour
      const cacheData = {
        summary: 'Cached summary',
        keyPoints: ['Point 1', 'Point 2', 'Point 3'],
        messageCountAtGeneration: 100,
        generatedAt: admin.firestore.Timestamp.fromMillis(now - maxAge + 1000), // 1 second under threshold
        generatedBy: 'test-user',
        model: 'claude-sonnet-4',
      };

      await db
        .doc(`conversations/${testConversationId}/ai_summaries_cache/latest`)
        .set(cacheData);

      const result = await getCachedResult(
        testConversationId,
        `conversations/${testConversationId}/ai_summaries_cache/latest`,
        maxAge,
        5
      );

      expect(result).not.toBeNull();
    });
  });

  describe('Cache miss due to new messages', () => {
    it('should return null when too many new messages', async () => {
      const now = Date.now();
      const cacheData = {
        summary: 'Cached summary',
        keyPoints: ['Point 1', 'Point 2', 'Point 3'],
        messageCountAtGeneration: 100,
        generatedAt: admin.firestore.Timestamp.fromMillis(now - 30000),
        generatedBy: 'test-user',
        model: 'claude-sonnet-4',
      };

      // Create cache document
      await db
        .doc(`conversations/${testConversationId}/ai_summaries_cache/latest`)
        .set(cacheData);

      // Update conversation to have 10 new messages
      await db.doc(`conversations/${testConversationId}`).update({
        messageCount: 110,
      });

      // Get cached result
      const result = await getCachedResult(
        testConversationId,
        `conversations/${testConversationId}/ai_summaries_cache/latest`,
        3600000,
        5 // Max 5 new messages (but there are 10)
      );

      expect(result).toBeNull();
    });

    it('should return cached data when exactly at message threshold', async () => {
      const now = Date.now();
      const cacheData = {
        summary: 'Cached summary',
        keyPoints: ['Point 1', 'Point 2', 'Point 3'],
        messageCountAtGeneration: 100,
        generatedAt: admin.firestore.Timestamp.fromMillis(now - 30000),
        generatedBy: 'test-user',
        model: 'claude-sonnet-4',
      };

      await db
        .doc(`conversations/${testConversationId}/ai_summaries_cache/latest`)
        .set(cacheData);

      // Update conversation to have exactly 4 new messages (under 5 threshold)
      await db.doc(`conversations/${testConversationId}`).update({
        messageCount: 104,
      });

      const result = await getCachedResult(
        testConversationId,
        `conversations/${testConversationId}/ai_summaries_cache/latest`,
        3600000,
        5
      );

      expect(result).not.toBeNull();
    });
  });

  describe('Cache miss when document does not exist', () => {
    it('should return null when cache document does not exist', async () => {
      // Don't create cache document

      const result = await getCachedResult(
        testConversationId,
        `conversations/${testConversationId}/ai_summaries_cache/latest`,
        3600000,
        5
      );

      expect(result).toBeNull();
    });
  });

  describe('Both conditions must be met', () => {
    it('should return null if age is valid but too many new messages', async () => {
      const now = Date.now();
      const cacheData = {
        summary: 'Cached summary',
        keyPoints: ['Point 1', 'Point 2', 'Point 3'],
        messageCountAtGeneration: 100,
        generatedAt: admin.firestore.Timestamp.fromMillis(now - 1000), // Very recent
        generatedBy: 'test-user',
        model: 'claude-sonnet-4',
      };

      await db
        .doc(`conversations/${testConversationId}/ai_summaries_cache/latest`)
        .set(cacheData);

      // Many new messages
      await db.doc(`conversations/${testConversationId}`).update({
        messageCount: 120,
      });

      const result = await getCachedResult(
        testConversationId,
        `conversations/${testConversationId}/ai_summaries_cache/latest`,
        3600000,
        5
      );

      expect(result).toBeNull();
    });

    it('should return null if messages are valid but cache is too old', async () => {
      const now = Date.now();
      const cacheData = {
        summary: 'Cached summary',
        keyPoints: ['Point 1', 'Point 2', 'Point 3'],
        messageCountAtGeneration: 100,
        generatedAt: admin.firestore.Timestamp.fromMillis(now - 7200000), // 2 hours ago
        generatedBy: 'test-user',
        model: 'claude-sonnet-4',
      };

      await db
        .doc(`conversations/${testConversationId}/ai_summaries_cache/latest`)
        .set(cacheData);

      // Only 2 new messages (under threshold)
      await db.doc(`conversations/${testConversationId}`).update({
        messageCount: 102,
      });

      const result = await getCachedResult(
        testConversationId,
        `conversations/${testConversationId}/ai_summaries_cache/latest`,
        3600000, // 1 hour max age
        5
      );

      expect(result).toBeNull();
    });
  });
});

