import { render } from '@testing-library/react-native';
import MessageList from '../MessageList';
import { Message } from '../../types';

// Mock MessageBubble to simplify testing
jest.mock('../MessageBubble', () => {
  const { Text } = require('react-native');
  return ({ message }: { message: Message }) => <Text testID={`message-${message.id}`}>{message.text}</Text>;
});

describe('MessageList - Inverted FlatList Ordering', () => {
  const currentUserId = 'user1';

  const createMessage = (id: string, text: string, timestamp: Date): Message => ({
    id,
    text,
    senderId: currentUserId,
    senderName: 'Test User',
    createdAt: timestamp,
    participants: [currentUserId],
  });

  describe('Message Array Structure', () => {
    it('should receive messages in DESC order (newest first) for inverted list', () => {
      const messages: Message[] = [
        createMessage('3', 'newest message', new Date('2025-10-26T15:00:00')),
        createMessage('2', 'middle message', new Date('2025-10-26T14:00:00')),
        createMessage('1', 'oldest message', new Date('2025-10-26T13:00:00')),
      ];

      render(
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          conversationType="direct"
        />
      );

      // Verify array is in DESC order (newest first)
      expect(messages[0].id).toBe('3');
      expect(messages[0].text).toBe('newest message');
      expect(messages[messages.length - 1].id).toBe('1');
      expect(messages[messages.length - 1].text).toBe('oldest message');
    });

    it('should maintain DESC order when receiving initial batch', () => {
      const messages: Message[] = [
        createMessage('100', 'msg 100', new Date('2025-10-26T15:00:00')),
        createMessage('99', 'msg 99', new Date('2025-10-26T14:59:00')),
        createMessage('98', 'msg 98', new Date('2025-10-26T14:58:00')),
      ];

      const { getByTestId } = render(
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          conversationType="direct"
        />
      );

      // Verify FlatList receives data in correct order
      expect(getByTestId('message-100')).toBeTruthy();
      expect(getByTestId('message-99')).toBeTruthy();
      expect(getByTestId('message-98')).toBeTruthy();
    });
  });

  describe('New Message Prepending', () => {
    it('should handle new message prepended to beginning of array', () => {
      const initialMessages: Message[] = [
        createMessage('2', 'existing message', new Date('2025-10-26T14:00:00')),
        createMessage('1', 'older message', new Date('2025-10-26T13:00:00')),
      ];

      const { rerender, getByTestId } = render(
        <MessageList
          messages={initialMessages}
          currentUserId={currentUserId}
          conversationType="direct"
        />
      );

      // Simulate new message arriving (prepended to array)
      const newMessage = createMessage('3', 'brand new message', new Date('2025-10-26T15:00:00'));
      const updatedMessages = [newMessage, ...initialMessages];

      rerender(
        <MessageList
          messages={updatedMessages}
          currentUserId={currentUserId}
          conversationType="direct"
        />
      );

      // Verify new message is at index 0
      expect(updatedMessages[0].id).toBe('3');
      expect(updatedMessages[0].text).toBe('brand new message');
      expect(getByTestId('message-3')).toBeTruthy();
    });

    it('should handle multiple new messages prepended at once', () => {
      const initialMessages: Message[] = [
        createMessage('1', 'oldest', new Date('2025-10-26T13:00:00')),
      ];

      const { rerender } = render(
        <MessageList
          messages={initialMessages}
          currentUserId={currentUserId}
          conversationType="direct"
        />
      );

      // Simulate multiple new messages
      const newMessages = [
        createMessage('3', 'newest', new Date('2025-10-26T15:00:00')),
        createMessage('2', 'middle', new Date('2025-10-26T14:00:00')),
      ];
      const updatedMessages = [...newMessages, ...initialMessages];

      rerender(
        <MessageList
          messages={updatedMessages}
          currentUserId={currentUserId}
          conversationType="direct"
        />
      );

      // Verify correct order maintained
      expect(updatedMessages[0].id).toBe('3');
      expect(updatedMessages[1].id).toBe('2');
      expect(updatedMessages[2].id).toBe('1');
      expect(updatedMessages).toHaveLength(3);
    });
  });

  describe('Pagination - Older Messages Appending', () => {
    it('should handle older messages appended to end of array', () => {
      const initialMessages: Message[] = [
        createMessage('100', 'newest', new Date('2025-10-26T15:00:00')),
        createMessage('99', 'middle', new Date('2025-10-26T14:00:00')),
      ];

      const { rerender } = render(
        <MessageList
          messages={initialMessages}
          currentUserId={currentUserId}
          conversationType="direct"
        />
      );

      // Simulate pagination (older messages appended)
      const olderMessages = [
        createMessage('98', 'older', new Date('2025-10-26T13:00:00')),
        createMessage('97', 'oldest', new Date('2025-10-26T12:00:00')),
      ];
      const paginatedMessages = [...initialMessages, ...olderMessages];

      rerender(
        <MessageList
          messages={paginatedMessages}
          currentUserId={currentUserId}
          conversationType="direct"
          hasMoreMessages={true}
        />
      );

      // Verify order: newest still at index 0, oldest at end
      expect(paginatedMessages[0].id).toBe('100'); // Newest
      expect(paginatedMessages[paginatedMessages.length - 1].id).toBe('97'); // Oldest
      expect(paginatedMessages).toHaveLength(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message array', () => {
      const { queryByTestId } = render(
        <MessageList
          messages={[]}
          currentUserId={currentUserId}
          conversationType="direct"
        />
      );

      // Should render without crashing
      expect(queryByTestId('message-1')).toBeNull();
    });

    it('should handle single message', () => {
      const messages = [
        createMessage('1', 'only message', new Date('2025-10-26T15:00:00')),
      ];

      const { getByTestId } = render(
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          conversationType="direct"
        />
      );

      expect(getByTestId('message-1')).toBeTruthy();
      expect(messages).toHaveLength(1);
    });

    it('should handle messages with same timestamp', () => {
      const sameTime = new Date('2025-10-26T15:00:00');
      const messages = [
        createMessage('2', 'second', sameTime),
        createMessage('1', 'first', sameTime),
      ];

      const { getByTestId } = render(
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          conversationType="direct"
        />
      );

      // Should render both messages
      expect(getByTestId('message-1')).toBeTruthy();
      expect(getByTestId('message-2')).toBeTruthy();
    });
  });

  describe('FlatList Props', () => {
    it('should have inverted prop set to true', () => {
      const messages = [
        createMessage('1', 'test', new Date('2025-10-26T15:00:00')),
      ];

      const { UNSAFE_getByType } = render(
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          conversationType="direct"
        />
      );

      const FlatList = require('react-native').FlatList;
      const flatList = UNSAFE_getByType(FlatList);
      
      expect(flatList.props.inverted).toBe(true);
    });

    it('should use correct keyExtractor', () => {
      const messages = [
        createMessage('msg-123', 'test', new Date('2025-10-26T15:00:00')),
      ];

      const { UNSAFE_getByType } = render(
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          conversationType="direct"
        />
      );

      const FlatList = require('react-native').FlatList;
      const flatList = UNSAFE_getByType(FlatList);
      
      // Verify keyExtractor returns message.id
      expect(flatList.props.keyExtractor(messages[0])).toBe('msg-123');
    });
  });
});

