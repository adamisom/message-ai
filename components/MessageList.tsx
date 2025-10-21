import { FlatList, View, StyleSheet } from 'react-native';
import { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: Date | { toDate: () => Date } | null;
  status?: 'sending' | 'sent' | 'failed' | 'queued';
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  conversationType: 'direct' | 'group';
}

export default function MessageList({ 
  messages, 
  currentUserId, 
  conversationType 
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

