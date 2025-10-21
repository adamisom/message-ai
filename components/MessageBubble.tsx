import { View, Text, StyleSheet } from 'react-native';
import { formatMessageTime } from '../utils/timeFormat';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: Date | { toDate: () => Date } | null;
  status?: 'sending' | 'sent' | 'failed' | 'queued';
}

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showSenderName?: boolean; // For group chats
}

export default function MessageBubble({ 
  message, 
  isOwnMessage, 
  showSenderName = false 
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

  return (
    <View style={[
      styles.container, 
      isOwnMessage ? styles.ownMessage : styles.otherMessage
    ]}>
      {/* Show sender name for group chats (received messages only) */}
      {showSenderName && !isOwnMessage && (
        <Text style={styles.senderName}>{message.senderName}</Text>
      )}
      
      <View style={[
        styles.bubble,
        isOwnMessage ? styles.ownBubble : styles.otherBubble
      ]}>
        <Text style={[
          styles.text,
          isOwnMessage ? styles.ownText : styles.otherText
        ]}>
          {message.text}
        </Text>
        
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
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
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
  text: {
    fontSize: 16,
    lineHeight: 20,
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
});

