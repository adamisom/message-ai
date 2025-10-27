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
  onRetryMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  isLoadingMore?: boolean;
  hasMoreMessages?: boolean;
  onScrollToBottom?: () => void; // Callback when user scrolls to bottom
  onScrollAwayFromBottom?: () => void; // Callback when user scrolls away from bottom
}

export interface MessageListRef {
  scrollToIndex: (params: { index: number; animated?: boolean; viewPosition?: number }) => void;
  scrollToEnd: (params?: { animated?: boolean }) => void;
}

const MessageList = forwardRef<MessageListRef, MessageListProps>(({ 
  messages, 
  currentUserId, 
  conversationType,
  getReadStatus,
  getReadDetails,
  highlightedMessageId,
  onLoadMore,
  onRetryMessage,
  onDeleteMessage,
  isLoadingMore = false,
  hasMoreMessages = false,
  onScrollToBottom,
  onScrollAwayFromBottom,
}, ref) => {
  const flatListRef = useRef<FlatList>(null);
  const isAtBottomRef = useRef(true); // Track if user is at bottom

  // Expose scrollToIndex and scrollToEnd methods to parent
  useImperativeHandle(ref, () => ({
    scrollToIndex: (params) => {
      flatListRef.current?.scrollToIndex(params);
    },
    scrollToEnd: (params) => {
      flatListRef.current?.scrollToEnd(params);
    },
  }));

  // Auto-scroll to bottom ONLY on initial load
  // NOTE: With inverted FlatList, we don't need auto-scroll!
  // The list naturally starts at the "top" which shows newest messages at bottom of screen
  const isInitialLoadRef = useRef(true);
  const hasScrolledInitiallyRef = useRef(false);

  // Remove all auto-scroll logic - inverted list handles this naturally
  useEffect(() => {
    if (isInitialLoadRef.current && messages.length > 0) {
      console.log('📜 [MessageList] Initial messages loaded (inverted list - no scroll needed)');
      isInitialLoadRef.current = false;
    }
  }, [messages.length]);

  // Keep content height tracking for debugging
  const contentHeightRef = useRef(0);

  // Handle content size change - just track height
  const handleContentSizeChange = (contentWidth: number, contentHeight: number) => {
    contentHeightRef.current = contentHeight;
  };

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
  // NOTE: With inverted list, "top" and "bottom" are flipped!
  // Scrolling "down" in inverted list = scrolling up in visual UI (toward older messages)
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    
    // In inverted list: scrolling DOWN (larger contentOffset.y) = loading older messages
    // Check if scrolled near BOTTOM of inverted list (which appears as top in UI)
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    
    // Trigger pagination when near bottom of inverted list (= top of visual UI = older messages)
    if (distanceFromBottom < 100 && hasMoreMessages && !isLoadingMore && onLoadMore) {
      console.log('📜 [MessageList] Near top of UI (bottom of inverted list), loading more messages...');
      onLoadMore();
    }
    
    // Check if at TOP of inverted list (= bottom of visual UI = newest messages)
    const isAtTop = contentOffset.y < 100;
    
    // Detect state change
    if (isAtTop !== isAtBottomRef.current) {
      isAtBottomRef.current = isAtTop;
      
      if (isAtTop && onScrollToBottom) {
        console.log('⬇️ [MessageList] User at bottom of UI (top of inverted list), notifying parent');
        onScrollToBottom();
      } else if (!isAtTop && onScrollAwayFromBottom) {
        console.log('⬆️ [MessageList] User scrolled away from bottom, notifying parent');
        onScrollAwayFromBottom();
      }
    }
  };

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      inverted={true}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <MessageBubble
          message={item}
          isOwnMessage={item.senderId === currentUserId}
          showSenderName={conversationType === 'group'}
          readStatus={getReadStatus ? getReadStatus(item) : null}
          readDetails={getReadDetails ? getReadDetails(item) : null}
          isHighlighted={highlightedMessageId === item.id}
          onRetry={onRetryMessage}
          onDelete={onDeleteMessage}
        />
      )}
      contentContainerStyle={styles.container}
      ListHeaderComponent={renderListHeader}
      ListFooterComponent={() => <View style={{ height: 8 }} />}
      onScroll={handleScroll}
      scrollEventThrottle={400}
      onContentSizeChange={handleContentSizeChange}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      }}
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

