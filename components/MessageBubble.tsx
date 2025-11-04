import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Message } from '../types';
import { FEATURE_FLAGS } from '../utils/featureFlags';
import { formatMessageTime } from '../utils/timeFormat';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showSenderName?: boolean; // For group chats
  readStatus?: '✓' | '✓✓' | null; // For read receipts (Phase 5)
  readDetails?: { // Phase 3: Detailed read receipts for group chats
    readBy: Array<{ uid: string; displayName: string }>;
    unreadBy: Array<{ uid: string; displayName: string }>;
  } | null;
  isHighlighted?: boolean; // For search result highlighting
  onRetry?: (messageId: string) => void; // Retry failed message
  onDelete?: (messageId: string) => void; // Delete failed message
  onLongPress?: (message: Message) => void; // NEW: Long-press handler for context menu
  conversationType?: 'direct' | 'group'; // NEW: To determine if spam reporting is available
}

export default function MessageBubble({ 
  message, 
  isOwnMessage, 
  showSenderName = false,
  readStatus,
  readDetails,
  isHighlighted = false,
  onRetry,
  onDelete,
  onLongPress,
  conversationType = 'direct'
}: MessageBubbleProps) {
  const getTimestamp = () => {
    if (!message.createdAt) return 'Sending...';
    
    if (typeof message.createdAt === 'object' && 'toDate' in message.createdAt) {
      return formatMessageTime(message.createdAt.toDate());
    }
    
    if (message.createdAt instanceof Date) {
      return formatMessageTime(message.createdAt);
    }
    
    return 'Sending...';
  };

  const getPriorityBadge = () => {
    // Check feature flag
    if (!FEATURE_FLAGS.PRIORITY_BADGES_ENABLED) {
      return null;
    }
    
    // Show badge for manually marked urgent OR AI-detected high priority
    if (message.manuallyMarkedUrgent || message.priority === 'high') return '🔴';
    
    // Don't show medium or low priority badges
    return null;
  };

  const priorityBadge = getPriorityBadge();
  
  // Determine if long-press should be enabled
  const shouldEnableLongPress = onLongPress;
  
  // Format message text (handle deleted messages)
  const displayText = message.isDeleted 
    ? '[Message deleted]'
    : message.text;
  
  const bubbleContent = (
    <View style={[
      styles.container, 
      isOwnMessage ? styles.ownMessage : styles.otherMessage,
      isHighlighted && styles.highlightedContainer
    ]}>
      {/* Show sender name for group chats (received messages only) */}
      {showSenderName && !isOwnMessage && (
        <Text style={styles.senderName}>{message.senderName}</Text>
      )}
      
      <View style={[
        styles.bubble,
        isOwnMessage ? styles.ownBubble : styles.otherBubble,
        isHighlighted && styles.highlightedBubble
      ]}>
        <Text style={[
          styles.text,
          isOwnMessage ? styles.ownText : styles.otherText,
          message.isDeleted && styles.deletedText
        ]}>
          {displayText}
        </Text>
        {priorityBadge && (
          <Text style={styles.priorityBadge}>{priorityBadge}</Text>
        )}
        
        <View style={styles.footer}>
          <Text style={[
            styles.time,
            isOwnMessage ? styles.ownTime : styles.otherTime
          ]}>
            {getTimestamp()}{message.isEdited && ' (edited)'}
          </Text>
          
          {/* Show status for own messages */}
          {isOwnMessage && message.status && (
            <Text style={styles.status}>
              {message.status === 'sending' && '⏳'}
              {message.status === 'queued' && '📤'}
              {message.status === 'failed' && '❌'}
            </Text>
          )}
          
          {/* Show read status for own messages (Phase 5) */}
          {isOwnMessage && !message.status && readStatus && (
            <Text style={styles.readStatus}>{readStatus}</Text>
          )}
        </View>
      </View>
      
      {/* Phase 3: Detailed read receipts for group chats */}
      {isOwnMessage && readDetails && readDetails.readBy.length > 0 && (
        <View style={styles.readDetailsContainer}>
          <Text style={styles.readDetailsText}>
            Read by {readDetails.readBy.map(r => r.displayName).join(', ')}
          </Text>
        </View>
      )}
      
      {/* Failed message actions */}
      {isOwnMessage && message.status === 'failed' && (
        <View style={styles.failedActionsContainer}>
          <Text style={styles.failedText}>Failed to send</Text>
          <View style={styles.failedButtons}>
            {onRetry && (
              <TouchableOpacity 
                onPress={() => onRetry(message.id)} 
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity 
                onPress={() => onDelete(message.id)} 
                style={styles.deleteButton}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
  
  // Wrap with TouchableOpacity for long-press if enabled
  if (shouldEnableLongPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={() => onLongPress(message)}
        delayLongPress={500}
      >
        {bubbleContent}
      </TouchableOpacity>
    );
  }

  return bubbleContent;
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 12,
  },
  highlightedContainer: {
    backgroundColor: 'rgba(255, 235, 59, 0.2)', // Light yellow highlight
    borderRadius: 8,
    padding: 4,
    marginVertical: 2,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 2,
    marginLeft: 12,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  highlightedBubble: {
    borderWidth: 2,
    borderColor: '#FFD700', // Gold border for highlighted message
  },
  text: {
    fontSize: 16,
    lineHeight: 20,
  },
  deletedText: {
    fontStyle: 'italic',
    opacity: 0.6,
  },
  priorityBadge: {
    fontSize: 16,
    marginLeft: 8,
  },
  ownText: {
    color: '#fff',
  },
  otherText: {
    color: '#000',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  time: {
    fontSize: 11,
  },
  ownTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTime: {
    color: '#8E8E93',
  },
  status: {
    fontSize: 11,
  },
  readStatus: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 4,
  },
  readDetailsContainer: {
    marginTop: 4,
    marginRight: 12,
  },
  readDetailsText: {
    fontSize: 11,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  // Failed message styles
  failedActionsContainer: {
    marginTop: 4,
    marginRight: 8,
  },
  failedText: {
    fontSize: 11,
    color: '#FF3B30',
    marginBottom: 4,
  },
  failedButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

