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
    console.log(`[ConversationItem] Checking unread for ${conversation.id}:`, {
      hasLastMessageAt: !!conversation.lastMessageAt,
      hasLastReadAt: !!conversation.lastReadAt,
      hasLastRead: !!conversation.lastRead,
      lastMessageAt: conversation.lastMessageAt,
      lastReadAt: conversation.lastReadAt,
      lastRead: conversation.lastRead,
      currentUserId,
    });

    // If no messages yet, not unread
    if (!conversation.lastMessageAt) {
      console.log(`[ConversationItem] ${conversation.id}: No messages yet`);
      return false;
    }
    
    // If no lastReadAt tracking, fall back to checking lastRead existence
    if (!conversation.lastReadAt) {
      console.log(`[ConversationItem] ${conversation.id}: No lastReadAt, using legacy check`);
      // Legacy check: if no lastRead object at all, it's unread
      if (!conversation.lastRead) {
        console.log(`[ConversationItem] ${conversation.id}: No lastRead object - UNREAD`);
        return true;
      }
      // If user hasn't read any messages in this conversation, it's unread
      const hasUserRead = !!conversation.lastRead[currentUserId];
      console.log(`[ConversationItem] ${conversation.id}: User read status: ${hasUserRead}`);
      return !hasUserRead;
    }
    
    // New logic: Compare timestamps
    const userLastReadAt = conversation.lastReadAt[currentUserId];
    if (!userLastReadAt) {
      console.log(`[ConversationItem] ${conversation.id}: User never read - UNREAD`);
      return true; // Never read
    }
    
    // Compare: is lastMessageAt after lastReadAt?
    const lastMessageTime = conversation.lastMessageAt.toMillis ? 
      conversation.lastMessageAt.toMillis() : 
      conversation.lastMessageAt.toDate().getTime();
    
    const lastReadTime = userLastReadAt.toMillis ? 
      userLastReadAt.toMillis() : 
      userLastReadAt.toDate().getTime();
    
    const isUnread = lastMessageTime > lastReadTime;
    console.log(`[ConversationItem] ${conversation.id}: Timestamp comparison:`, {
      lastMessageTime,
      lastReadTime,
      isUnread,
    });
    
    return isUnread;
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
          {conversation.lastMessage?.text || 'No messages yet'}
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

