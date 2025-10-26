/**
 * Failed Messages Service Tests
 * Tests message retry/delete with AsyncStorage persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '../../types';
import { FailedMessagesService } from '../failedMessagesService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('FailedMessagesService', () => {
  const createMockMessage = (id: string, text: string): Message => ({
    id,
    text,
    senderId: 'user123',
    senderName: 'Test User',
    createdAt: new Date(),
    participants: ['user123', 'user456'],
    status: 'failed',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('saveFailedMessage()', () => {
    it('should save failed message to storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      
      const message = createMockMessage('msg1', 'Failed message');
      const conversationId = 'conv123';

      await FailedMessagesService.saveFailedMessage(message, conversationId);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const [key, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      
      expect(key).toBe('@messageai:failed_messages');
      const stored = JSON.parse(value);
      expect(stored).toHaveLength(1);
      expect(stored[0].message.id).toBe('msg1');
      expect(stored[0].message.text).toBe('Failed message');
      expect(stored[0].conversationId).toBe(conversationId);
      expect(stored[0]).toHaveProperty('failedAt');
    });

    it('should prepend new message to existing failed messages', async () => {
      const existingFailed = [
        {
          message: createMockMessage('msg1', 'Old message'),
          conversationId: 'conv123',
          failedAt: '2025-10-26T10:00:00Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existingFailed));

      const newMessage = createMockMessage('msg2', 'New message');
      await FailedMessagesService.saveFailedMessage(newMessage, 'conv123');

      const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const stored = JSON.parse(value);

      expect(stored).toHaveLength(2);
      expect(stored[0].message.id).toBe('msg2'); // New message first
      expect(stored[1].message.id).toBe('msg1'); // Old message second
    });

    it('should trim to last 50 failed messages', async () => {
      // Create 50 existing messages
      const existingFailed = Array.from({ length: 50 }, (_, i) => ({
        message: createMockMessage(`msg${i}`, `Message ${i}`),
        conversationId: 'conv123',
        failedAt: new Date(2025, 9, 26, 10, i).toISOString(),
      }));

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existingFailed));

      // Add 51st message
      const newMessage = createMockMessage('msg50', 'Message 50');
      await FailedMessagesService.saveFailedMessage(newMessage, 'conv123');

      const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const stored = JSON.parse(value);

      expect(stored).toHaveLength(50); // Trimmed to 50
      expect(stored[0].message.id).toBe('msg50'); // New message kept
      expect(stored[49].message.text).toBe('Message 48'); // 49th oldest kept (msg0 was trimmed)
    });

    it('should log save action', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      
      const message = createMockMessage('msg1', 'Test');
      await FailedMessagesService.saveFailedMessage(message, 'conv123');

      expect(console.log).toHaveBeenCalledWith(
        '[FailedMessages] Saved failed message:',
        'msg1'
      );
    });

    it('should handle save errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage full'));

      const message = createMockMessage('msg1', 'Test');
      
      await expect(
        FailedMessagesService.saveFailedMessage(message, 'conv123')
      ).resolves.not.toThrow();

      expect(console.warn).toHaveBeenCalledWith(
        '[FailedMessages] Failed to save:',
        expect.any(Error)
      );
    });
  });

  describe('removeFailedMessage()', () => {
    it('should remove specific failed message by ID', async () => {
      const existingFailed = [
        {
          message: createMockMessage('msg1', 'Message 1'),
          conversationId: 'conv123',
          failedAt: '2025-10-26T10:00:00Z',
        },
        {
          message: createMockMessage('msg2', 'Message 2'),
          conversationId: 'conv123',
          failedAt: '2025-10-26T10:01:00Z',
        },
        {
          message: createMockMessage('msg3', 'Message 3'),
          conversationId: 'conv456',
          failedAt: '2025-10-26T10:02:00Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existingFailed));

      await FailedMessagesService.removeFailedMessage('msg2');

      const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const stored = JSON.parse(value);

      expect(stored).toHaveLength(2);
      expect(stored.map((f: any) => f.message.id)).toEqual(['msg1', 'msg3']);
    });

    it('should handle removal of non-existent message', async () => {
      const existingFailed = [
        {
          message: createMockMessage('msg1', 'Message 1'),
          conversationId: 'conv123',
          failedAt: '2025-10-26T10:00:00Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existingFailed));

      await FailedMessagesService.removeFailedMessage('nonexistent');

      const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const stored = JSON.parse(value);

      expect(stored).toHaveLength(1); // Original still there
      expect(stored[0].message.id).toBe('msg1');
    });

    it('should log removal action', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([]));

      await FailedMessagesService.removeFailedMessage('msg1');

      expect(console.log).toHaveBeenCalledWith(
        '[FailedMessages] Removed failed message:',
        'msg1'
      );
    });

    it('should handle removal errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Read error'));

      await expect(
        FailedMessagesService.removeFailedMessage('msg1')
      ).resolves.not.toThrow();

      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('getFailedMessages()', () => {
    it('should retrieve all failed messages', async () => {
      const mockFailed = [
        {
          message: createMockMessage('msg1', 'Message 1'),
          conversationId: 'conv123',
          failedAt: '2025-10-26T10:00:00Z',
        },
        {
          message: createMockMessage('msg2', 'Message 2'),
          conversationId: 'conv456',
          failedAt: '2025-10-26T10:01:00Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockFailed));

      const result = await FailedMessagesService.getFailedMessages();

      // Note: createdAt will be a string after JSON parsing, not a Date object
      expect(result).toHaveLength(2);
      expect(result[0].message.id).toBe('msg1');
      expect(result[1].message.id).toBe('msg2');
      expect(result[0].conversationId).toBe('conv123');
      expect(result[1].conversationId).toBe('conv456');
    });

    it('should return empty array when no failed messages', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await FailedMessagesService.getFailedMessages();

      expect(result).toEqual([]);
    });

    it('should handle corrupted data gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('invalid{json');

      const result = await FailedMessagesService.getFailedMessages();

      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('getFailedMessagesForConversation()', () => {
    it('should filter messages by conversation ID', async () => {
      const mockFailed = [
        {
          message: createMockMessage('msg1', 'Conv123 Message 1'),
          conversationId: 'conv123',
          failedAt: '2025-10-26T10:00:00Z',
        },
        {
          message: createMockMessage('msg2', 'Conv456 Message'),
          conversationId: 'conv456',
          failedAt: '2025-10-26T10:01:00Z',
        },
        {
          message: createMockMessage('msg3', 'Conv123 Message 2'),
          conversationId: 'conv123',
          failedAt: '2025-10-26T10:02:00Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockFailed));

      const result = await FailedMessagesService.getFailedMessagesForConversation('conv123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('msg1');
      expect(result[1].id).toBe('msg3');
      expect(result[0].text).toContain('Conv123');
    });

    it('should return empty array when no messages for conversation', async () => {
      const mockFailed = [
        {
          message: createMockMessage('msg1', 'Message'),
          conversationId: 'conv456',
          failedAt: '2025-10-26T10:00:00Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockFailed));

      const result = await FailedMessagesService.getFailedMessagesForConversation('conv123');

      expect(result).toEqual([]);
    });
  });

  describe('clearAllFailedMessages()', () => {
    it('should remove all failed messages from storage', async () => {
      await FailedMessagesService.clearAllFailedMessages();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@messageai:failed_messages');
      expect(console.log).toHaveBeenCalledWith('[FailedMessages] Cleared all failed messages');
    });

    it('should handle clear errors gracefully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error('Clear error'));

      await expect(
        FailedMessagesService.clearAllFailedMessages()
      ).resolves.not.toThrow();

      expect(console.warn).toHaveBeenCalledWith(
        '[FailedMessages] Failed to clear:',
        expect.any(Error)
      );
    });
  });

  describe('Data Integrity', () => {
    it('should preserve message properties correctly', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const message: Message = {
        id: 'msg123',
        text: 'Test message',
        senderId: 'user123',
        senderName: 'John Doe',
        createdAt: new Date('2025-10-26T12:00:00Z'),
        participants: ['user123', 'user456'],
        status: 'failed',
      };

      await FailedMessagesService.saveFailedMessage(message, 'conv789');

      const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const stored = JSON.parse(value);

      expect(stored[0].message).toMatchObject({
        id: 'msg123',
        text: 'Test message',
        senderId: 'user123',
        senderName: 'John Doe',
        participants: ['user123', 'user456'],
        status: 'failed',
      });
      expect(stored[0].conversationId).toBe('conv789');
    });

    it('should store failedAt timestamp', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const message = createMockMessage('msg1', 'Test');
      await FailedMessagesService.saveFailedMessage(message, 'conv123');

      const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const stored = JSON.parse(value);

      expect(stored[0].failedAt).toBeDefined();
      expect(stored[0].failedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});

