import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Message } from '../types';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  conversationType: 'direct' | 'group';
  getReadStatus?: (message: Message) => '✓' | '✓✓' | null;
  highlightedMessageId?: string | null;
}

export interface MessageListRef {
  scrollToIndex: (params: { index: number; animated?: boolean; viewPosition?: number }) => void;
}

const MessageList = forwardRef<MessageListRef, MessageListProps>(({ 
  messages, 
  currentUserId, 
  conversationType,
  getReadStatus,
  highlightedMessageId
}, ref) => {
  const flatListRef = useRef<FlatList>(null);

  // Expose scrollToIndex method to parent
  useImperativeHandle(ref, () => ({
    scrollToIndex: (params) => {
      flatListRef.current?.scrollToIndex(params);
    },
  }));

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      console.log('📜 [MessageList] Auto-scrolling to latest message');
      // Small delay to ensure FlatList has rendered
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <MessageBubble
          message={item}
          isOwnMessage={item.senderId === currentUserId}
          showSenderName={conversationType === 'group'}
          readStatus={getReadStatus ? getReadStatus(item) : null}
          isHighlighted={highlightedMessageId === item.id}
        />
      )}
      contentContainerStyle={styles.container}
      onScrollToIndexFailed={(info) => {
        // Handle scroll failures gracefully
        console.warn('Scroll to index failed:', info);
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: info.index,
            animated: true,
            viewPosition: 0.5,
          });
        }, 100);
      }}
    />
  );
});

MessageList.displayName = 'MessageList';

export default MessageList;

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
});

