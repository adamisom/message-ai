import { Ionicons } from '@expo/vector-icons';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Participant {
  uid: string;
  displayName: string;
  email: string;
}

interface GroupParticipantsModalProps {
  visible: boolean;
  participants: Participant[];
  currentUserId: string; // NEW: to identify current user
  onClose: () => void;
}

export default function GroupParticipantsModal({
  visible,
  participants,
  currentUserId,
  onClose
}: GroupParticipantsModalProps) {
  // Sort participants: current user first, then others alphabetically
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.uid === currentUserId) return -1;
    if (b.uid === currentUserId) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.modal} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>Group Members ({participants.length})</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list}>
            {sortedParticipants.map((participant) => {
              const isCurrentUser = participant.uid === currentUserId;
              
              return (
                <View key={participant.uid} style={styles.participantItem}>
                  <View style={[
                    styles.avatar,
                    isCurrentUser && styles.avatarCurrent
                  ]}>
                    <Text style={styles.avatarText}>
                      {participant.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.participantInfo}>
                    <Text style={[
                      styles.participantName,
                      isCurrentUser && styles.participantNameCurrent
                    ]}>
                      {participant.displayName}
                      {isCurrentUser && ' (You)'}
                    </Text>
                    <Text style={[
                      styles.participantEmail,
                      isCurrentUser && styles.participantEmailCurrent
                    ]}>
                      {participant.email}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '85%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  list: {
    maxHeight: 400,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarCurrent: {
    backgroundColor: '#999',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  participantNameCurrent: {
    color: '#999',
  },
  participantEmail: {
    fontSize: 13,
    color: '#666',
  },
  participantEmailCurrent: {
    color: '#999',
  },
});

