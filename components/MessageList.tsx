import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { Message } from '../types';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  conversationType: 'direct' | 'group';
  getReadStatus?: (message: Message) => '✓' | '✓✓' | null;
  getReadDetails?: (message: Message) => {
    readBy: Array<{ uid: string; displayName: string }>;
    unreadBy: Array<{ uid: string; displayName: string }>;
  } | null;
  highlightedMessageId?: string | null;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMoreMessages?: boolean;
  onScrollToBottom?: () => void; // Callback when user scrolls to bottom
}

export interface MessageListRef {
  scrollToIndex: (params: { index: number; animated?: boolean; viewPosition?: number }) => void;
}

const MessageList = forwardRef<MessageListRef, MessageListProps>(({ 
  messages, 
  currentUserId, 
  conversationType,
  getReadStatus,
  getReadDetails,
  highlightedMessageId,
  onLoadMore,
  isLoadingMore = false,
  hasMoreMessages = false,
  onScrollToBottom,
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

  // Render loading indicator at the top when fetching older messages
  const renderListHeader = () => {
    if (!isLoadingMore && !hasMoreMessages) return null;
    
    return (
      <View style={styles.headerContainer}>
        {isLoadingMore && <ActivityIndicator size="small" color="#007AFF" />}
      </View>
    );
  };

  // Handle scroll events to detect when user is near the top OR bottom
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    
    // Check if scrolled near top (within 100px) - trigger load more
    if (contentOffset.y < 100 && hasMoreMessages && !isLoadingMore && onLoadMore) {
      console.log('📜 [MessageList] Near top, loading more messages...');
      onLoadMore();
    }
    
    // Check if scrolled to bottom (within 50px) - trigger onScrollToBottom callback
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromBottom < 50 && onScrollToBottom) {
      console.log('⬇️ [MessageList] User scrolled to bottom, notifying parent');
      onScrollToBottom();
    }
  };

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
          readDetails={getReadDetails ? getReadDetails(item) : null}
          isHighlighted={highlightedMessageId === item.id}
        />
      )}
      contentContainerStyle={styles.container}
      ListHeaderComponent={renderListHeader}
      onScroll={handleScroll}
      scrollEventThrottle={400}
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
  headerContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

