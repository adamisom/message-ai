/**
 * Failed Messages Service
 * Handles persistence and retry logic for failed messages using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '../types';

const FAILED_MESSAGES_KEY = '@messageai:failed_messages';

interface FailedMessageData {
  message: Message;
  conversationId: string;
  failedAt: string;
}

export class FailedMessagesService {
  /**
   * Save a failed message to AsyncStorage
   */
  static async saveFailedMessage(message: Message, conversationId: string): Promise<void> {
    try {
      const existing = await this.getFailedMessages();
      const newFailed: FailedMessageData = {
        message,
        conversationId,
        failedAt: new Date().toISOString(),
      };
      
      // Add to beginning of array
      const updated = [newFailed, ...existing];
      
      // Keep only last 50 failed messages
      const trimmed = updated.slice(0, 50);
      
      await AsyncStorage.setItem(FAILED_MESSAGES_KEY, JSON.stringify(trimmed));
      console.log('[FailedMessages] Saved failed message:', message.id);
    } catch (error) {
      console.warn('[FailedMessages] Failed to save:', error);
    }
  }
  
  /**
   * Remove a failed message from AsyncStorage
   */
  static async removeFailedMessage(messageId: string): Promise<void> {
    try {
      const existing = await this.getFailedMessages();
      const filtered = existing.filter(f => f.message.id !== messageId);
      
      await AsyncStorage.setItem(FAILED_MESSAGES_KEY, JSON.stringify(filtered));
      console.log('[FailedMessages] Removed failed message:', messageId);
    } catch (error) {
      console.warn('[FailedMessages] Failed to remove:', error);
    }
  }
  
  /**
   * Get all failed messages
   */
  static async getFailedMessages(): Promise<FailedMessageData[]> {
    try {
      const stored = await AsyncStorage.getItem(FAILED_MESSAGES_KEY);
      if (!stored) return [];
      
      return JSON.parse(stored) as FailedMessageData[];
    } catch (error) {
      console.warn('[FailedMessages] Failed to retrieve:', error);
      return [];
    }
  }
  
  /**
   * Get failed messages for a specific conversation
   */
  static async getFailedMessagesForConversation(conversationId: string): Promise<Message[]> {
    const all = await this.getFailedMessages();
    return all
      .filter(f => f.conversationId === conversationId)
      .map(f => f.message);
  }
  
  /**
   * Clear all failed messages
   */
  static async clearAllFailedMessages(): Promise<void> {
    try {
      await AsyncStorage.removeItem(FAILED_MESSAGES_KEY);
      console.log('[FailedMessages] Cleared all failed messages');
    } catch (error) {
      console.warn('[FailedMessages] Failed to clear:', error);
    }
  }
}

