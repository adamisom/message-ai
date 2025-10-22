import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getConversationName } from '../utils/conversationHelpers';
import { formatConversationTime } from '../utils/timeFormat';
import UserStatusBadge from './UserStatusBadge';

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: string[];
  participantDetails: Record<string, { displayName: string; email: string }>;
  lastMessageAt: any;
  lastMessage: string | null;
}

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  userStatuses?: Record<string, { isOnline: boolean; lastSeenAt: any }>;
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

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.nameContainer}>
            {conversation.type === 'group' && (
              <Ionicons name="people" size={16} color="#666" style={styles.groupIcon} />
            )}
            <Text style={styles.name} numberOfLines={1}>
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
            <Text style={styles.time}>
              {formatConversationTime(conversation.lastMessageAt.toDate())}
            </Text>
          )}
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
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
  groupIcon: {
    marginRight: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
});

