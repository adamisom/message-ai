import { StyleSheet, Text, View } from 'react-native';
import { Message } from '../types';
import { formatMessageTime } from '../utils/timeFormat';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showSenderName?: boolean; // For group chats
  readStatus?: '✓' | '✓✓' | null; // For read receipts (Phase 5)
  isHighlighted?: boolean; // For search result highlighting
}

export default function MessageBubble({ 
  message, 
  isOwnMessage, 
  showSenderName = false,
  readStatus,
  isHighlighted = false
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
    if (message.priority === 'high') return '🔴';
    if (message.priority === 'medium') return '🟡';
    return null;
  };

  const priorityBadge = getPriorityBadge();

  return (
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
        <View style={styles.textContainer}>
          <Text style={[
            styles.text,
            isOwnMessage ? styles.ownText : styles.otherText
          ]}>
            {message.text}
          </Text>
          {priorityBadge && (
            <Text style={styles.priorityBadge}>{priorityBadge}</Text>
          )}
        </View>
        
        <View style={styles.footer}>
          <Text style={[
            styles.time,
            isOwnMessage ? styles.ownTime : styles.otherTime
          ]}>
            {getTimestamp()}
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
    </View>
  );
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
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 16,
    lineHeight: 20,
    flex: 1,
  },
  priorityBadge: {
    fontSize: 16,
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
});

