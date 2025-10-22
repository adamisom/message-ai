import { useEffect, useRef } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Message } from '../types';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  conversationType: 'direct' | 'group';
  getReadStatus?: (message: Message) => '✓' | '✓✓' | null;
}

export default function MessageList({ 
  messages, 
  currentUserId, 
  conversationType,
  getReadStatus
}: MessageListProps) {
  const flatListRef = useRef<FlatList>(null);

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
        />
      )}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
});

