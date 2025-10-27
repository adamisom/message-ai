import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { commonModalStyles } from '../styles/commonModalStyles';
import { Conversation, Message } from '../types';
import { Colors } from '../utils/colors';
import { formatMessageTime } from '../utils/timeFormat';
import { ModalHeader } from './modals/ModalHeader';

interface PinnedMessagesModalProps {
  visible: boolean;
  conversation: Conversation | null;
  pinnedMessages: Message[];
  isAdmin: boolean;
  onClose: () => void;
  onJumpToMessage: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}

export default function PinnedMessagesModal({
  visible,
  conversation,
  pinnedMessages,
  isAdmin,
  onClose,
  onJumpToMessage,
  onUnpin,
}: PinnedMessagesModalProps) {
  const [unpinning, setUnpinning] = useState<string | null>(null);

  const handleUnpin = (messageId: string) => {
    Alert.alert(
      'Unpin Message',
      'Remove this pinned message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpin',
          style: 'destructive',
          onPress: async () => {
            setUnpinning(messageId);
            try {
              await onUnpin(messageId);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to unpin message');
            } finally {
              setUnpinning(null);
            }
          },
        },
      ]
    );
  };

  const sortedPinnedMessages = [...pinnedMessages].sort((a, b) => {
    const orderA = conversation?.pinnedMessages?.find(p => p.messageId === a.id)?.order ?? 0;
    const orderB = conversation?.pinnedMessages?.find(p => p.messageId === b.id)?.order ?? 0;
    return orderA - orderB;
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={commonModalStyles.container}>
        <ModalHeader
          title={`📌 Pinned Messages (${pinnedMessages.length}/5)`}
          onClose={onClose}
        />

        {pinnedMessages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📌</Text>
            <Text style={styles.emptyText}>No pinned messages</Text>
            <Text style={styles.emptySubtext}>
              {isAdmin
                ? 'Tap a message and select "Pin" to pin it here'
                : 'Admins can pin important messages for easy reference'}
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.content}>
            {sortedPinnedMessages.map((message, index) => {
              const pinInfo = conversation?.pinnedMessages?.find(
                p => p.messageId === message.id
              );

              return (
                <View key={message.id} style={styles.messageCard}>
                  <View style={styles.messageHeader}>
                    <View style={styles.messageHeaderLeft}>
                      <Text style={styles.messageSender}>{message.senderName}</Text>
                      <Text style={styles.messageTime}>
                        {formatMessageTime(
                          message.createdAt instanceof Date
                            ? message.createdAt
                            : message.createdAt?.toDate?.() || new Date()
                        )}
                      </Text>
                    </View>
                    <View style={styles.orderBadge}>
                      <Text style={styles.orderBadgeText}>#{index + 1}</Text>
                    </View>
                  </View>

                  <Text style={styles.messageText} numberOfLines={4}>
                    {message.text}
                  </Text>

                  {pinInfo && (
                    <Text style={styles.pinnedByText}>
                      Pinned by admin
                    </Text>
                  )}

                  <View style={styles.messageActions}>
                    <TouchableOpacity
                      style={styles.jumpButton}
                      onPress={() => {
                        onJumpToMessage(message.id);
                        onClose();
                      }}
                    >
                      <Ionicons
                        name="arrow-forward-circle-outline"
                        size={18}
                        color={Colors.primary}
                      />
                      <Text style={styles.jumpButtonText}>Jump to Message</Text>
                    </TouchableOpacity>

                    {isAdmin && (
                      <TouchableOpacity
                        style={styles.unpinButton}
                        onPress={() => handleUnpin(message.id)}
                        disabled={unpinning === message.id}
                      >
                        {unpinning === message.id ? (
                          <ActivityIndicator size="small" color="#FF3B30" />
                        ) : (
                          <>
                            <Ionicons name="close-circle-outline" size={18} color="#FF3B30" />
                            <Text style={styles.unpinButtonText}>Unpin</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageHeaderLeft: {
    flex: 1,
  },
  messageSender: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 2,
  },
  messageTime: {
    fontSize: 12,
    color: Colors.textLight,
  },
  orderBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  orderBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textMedium,
    marginBottom: 8,
  },
  pinnedByText: {
    fontSize: 11,
    color: Colors.textLight,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  messageActions: {
    flexDirection: 'row',
    gap: 12,
  },
  jumpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    gap: 6,
  },
  jumpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  unpinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 8,
    gap: 6,
    minWidth: 90,
  },
  unpinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
});

