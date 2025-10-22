/**
 * Unit tests for chatStore (Zustand state management)
 * Testing state updates and side effects
 */

import { useChatStore } from '../chatStore';

// Helper to reset store between tests
const resetStore = () => {
  useChatStore.setState({
    conversations: [],
    onlineStatuses: {},
  });
};

describe('chatStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('setConversations', () => {
    it('should replace all conversations', () => {
      const conversations = [
        {
          id: 'conv1',
          type: 'direct' as const,
          participants: ['user1', 'user2'],
          participantDetails: {},
          lastMessageAt: null,
          lastMessage: null,
          createdAt: null,
        },
        {
          id: 'conv2',
          type: 'group' as const,
          participants: ['user1', 'user2', 'user3'],
          participantDetails: {},
          lastMessageAt: null,
          lastMessage: null,
          createdAt: null,
        },
      ];

      useChatStore.getState().setConversations(conversations);

      expect(useChatStore.getState().conversations).toEqual(conversations);
      expect(useChatStore.getState().conversations).toHaveLength(2);
    });

    it('should replace existing conversations completely', () => {
      // Set initial conversations
      const initial = [
        {
          id: 'conv1',
          type: 'direct' as const,
          participants: ['user1', 'user2'],
          participantDetails: {},
          lastMessageAt: null,
          lastMessage: null,
          createdAt: null,
        },
      ];
      useChatStore.getState().setConversations(initial);

      // Replace with new conversations
      const updated = [
        {
          id: 'conv2',
          type: 'group' as const,
          participants: ['user1', 'user3'],
          participantDetails: {},
          lastMessageAt: null,
          lastMessage: null,
          createdAt: null,
        },
      ];
      useChatStore.getState().setConversations(updated);

      expect(useChatStore.getState().conversations).toEqual(updated);
      expect(useChatStore.getState().conversations).toHaveLength(1);
      expect(useChatStore.getState().conversations[0].id).toBe('conv2');
    });

    it('should accept empty array', () => {
      // Set some conversations first
      useChatStore.getState().setConversations([
        {
          id: 'conv1',
          type: 'direct' as const,
          participants: ['user1', 'user2'],
          participantDetails: {},
          lastMessageAt: null,
          lastMessage: null,
          createdAt: null,
        },
      ]);

      // Clear all conversations
      useChatStore.getState().setConversations([]);

      expect(useChatStore.getState().conversations).toEqual([]);
      expect(useChatStore.getState().conversations).toHaveLength(0);
    });
  });

  describe('addConversation', () => {
    it('should add conversation to the beginning of the list', () => {
      const existing = {
        id: 'conv1',
        type: 'direct' as const,
        participants: ['user1', 'user2'],
        participantDetails: {},
        lastMessageAt: null,
        lastMessage: null,
        createdAt: null,
      };

      const newConv = {
        id: 'conv2',
        type: 'group' as const,
        participants: ['user1', 'user3'],
        participantDetails: {},
        lastMessageAt: null,
        lastMessage: null,
        createdAt: null,
      };

      useChatStore.getState().setConversations([existing]);
      useChatStore.getState().addConversation(newConv);

      const conversations = useChatStore.getState().conversations;
      expect(conversations).toHaveLength(2);
      expect(conversations[0].id).toBe('conv2'); // new conversation first
      expect(conversations[1].id).toBe('conv1'); // existing conversation second
    });

    it('should add to empty list', () => {
      const newConv = {
        id: 'conv1',
        type: 'direct' as const,
        participants: ['user1', 'user2'],
        participantDetails: {},
        lastMessageAt: null,
        lastMessage: null,
        createdAt: null,
      };

      useChatStore.getState().addConversation(newConv);

      expect(useChatStore.getState().conversations).toHaveLength(1);
      expect(useChatStore.getState().conversations[0].id).toBe('conv1');
    });

    it('should not prevent duplicates (that\'s handled elsewhere)', () => {
      const conv = {
        id: 'conv1',
        type: 'direct' as const,
        participants: ['user1', 'user2'],
        participantDetails: {},
        lastMessageAt: null,
        lastMessage: null,
        createdAt: null,
      };

      useChatStore.getState().addConversation(conv);
      useChatStore.getState().addConversation(conv); // add same conversation

      // Store doesn't prevent duplicates - that's the responsibility of the caller
      expect(useChatStore.getState().conversations).toHaveLength(2);
    });
  });

  describe('updateOnlineStatus', () => {
    it('should add new online status', () => {
      const status = { isOnline: true, lastSeenAt: new Date() };

      useChatStore.getState().updateOnlineStatus('user1', status);

      expect(useChatStore.getState().onlineStatuses['user1']).toEqual(status);
    });

    it('should update existing online status', () => {
      const initialStatus = { isOnline: true, lastSeenAt: new Date('2023-01-01') };
      const updatedStatus = { isOnline: false, lastSeenAt: new Date('2023-01-02') };

      useChatStore.getState().updateOnlineStatus('user1', initialStatus);
      useChatStore.getState().updateOnlineStatus('user1', updatedStatus);

      expect(useChatStore.getState().onlineStatuses['user1']).toEqual(updatedStatus);
    });

    it('should handle multiple users', () => {
      const status1 = { isOnline: true, lastSeenAt: new Date() };
      const status2 = { isOnline: false, lastSeenAt: new Date() };

      useChatStore.getState().updateOnlineStatus('user1', status1);
      useChatStore.getState().updateOnlineStatus('user2', status2);

      expect(useChatStore.getState().onlineStatuses['user1']).toEqual(status1);
      expect(useChatStore.getState().onlineStatuses['user2']).toEqual(status2);
      expect(Object.keys(useChatStore.getState().onlineStatuses)).toHaveLength(2);
    });

    it('should not affect other users when updating one', () => {
      const status1 = { isOnline: true, lastSeenAt: new Date() };
      const status2 = { isOnline: false, lastSeenAt: new Date() };
      const status1Updated = { isOnline: false, lastSeenAt: new Date() };

      useChatStore.getState().updateOnlineStatus('user1', status1);
      useChatStore.getState().updateOnlineStatus('user2', status2);
      useChatStore.getState().updateOnlineStatus('user1', status1Updated);

      expect(useChatStore.getState().onlineStatuses['user1']).toEqual(status1Updated);
      expect(useChatStore.getState().onlineStatuses['user2']).toEqual(status2);
    });
  });

  describe('initial state', () => {
    it('should start with empty conversations', () => {
      expect(useChatStore.getState().conversations).toEqual([]);
    });

    it('should start with empty online statuses', () => {
      expect(useChatStore.getState().onlineStatuses).toEqual({});
    });
  });
});

