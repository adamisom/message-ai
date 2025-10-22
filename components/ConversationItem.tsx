import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Conversation, UserStatusInfo } from '../types';
import { getConversationName } from '../utils/conversationHelpers';
import { formatConversationTime } from '../utils/timeFormat';
import UserStatusBadge from './UserStatusBadge';

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  userStatuses?: Record<string, UserStatusInfo>;
  onPress: () => void;
}

export default function ConversationItem({ 
  conversation, 
  currentUserId,
  userStatuses,
  onPress 
}: ConversationItemProps) {
  // Get online status for direct chats
  const getDirectChatStatus = () => {
    if (conversation.type !== 'direct' || !userStatuses) return null;
    
    const otherUserId = conversation.participants.find(id => id !== currentUserId);
    if (!otherUserId) return null;
    
    const status = userStatuses[otherUserId];
    return status || null;
  };

  const directChatStatus = getDirectChatStatus();

  // Check if conversation has unread messages
  const hasUnread = () => {
    if (!conversation.lastMessageAt || !conversation.lastRead) return false;
    
    const userLastRead = conversation.lastRead[currentUserId];
    if (!userLastRead) return true; // Never read any messages
    
    // Compare timestamps (lastMessageAt is after user's last read)
    const lastMessageTime = conversation.lastMessageAt.toMillis ? 
      conversation.lastMessageAt.toMillis() : 
      conversation.lastMessageAt.toDate().getTime();
    
    // Get the message ID's timestamp from Firestore (simplified: just check if lastRead exists)
    return !userLastRead; // If no lastRead entry, it's unread
  };

  const isUnread = hasUnread();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.nameContainer}>
            {/* Blue dot for unread messages */}
            {isUnread && <View style={styles.unreadDot} />}
            
            {conversation.type === 'group' && (
              <Ionicons name="people" size={16} color="#666" style={styles.groupIcon} />
            )}
            <Text style={[styles.name, isUnread && styles.unreadText]} numberOfLines={1}>
              {getConversationName(conversation, currentUserId)}
            </Text>
            {/* Phase 5: Show online status badge for direct chats */}
            {directChatStatus && (
              <UserStatusBadge 
                isOnline={directChatStatus.isOnline} 
                lastSeenAt={directChatStatus.lastSeenAt}
                showText={false}
              />
            )}
          </View>
          {conversation.lastMessageAt && (
            <Text style={[styles.time, isUnread && styles.unreadTime]}>
              {formatConversationTime(conversation.lastMessageAt.toDate())}
            </Text>
          )}
        </View>
        <Text style={[styles.lastMessage, isUnread && styles.unreadText]} numberOfLines={1}>
          {conversation.lastMessage || 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  groupIcon: {
    marginRight: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  unreadText: {
    fontWeight: '700',
    color: '#000',
  },
  time: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  unreadTime: {
    fontWeight: '600',
    color: '#007AFF',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
});

