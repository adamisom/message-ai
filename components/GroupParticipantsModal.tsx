import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { 
  ActivityIndicator,
  Alert, 
  Modal, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput,
  TouchableOpacity, 
  View 
} from 'react-native';
import { translateError } from '../utils/errorTranslator';
import { validateEmail } from '../utils/validators';
import { addMemberToGroupChat } from '../services/groupChatService';

interface Participant {
  uid: string;
  displayName: string;
  email: string;
}

interface GroupParticipantsModalProps {
  visible: boolean;
  participants: Participant[];
  currentUserId: string;
  conversationId: string; // NEW: needed for adding members
  conversationType: 'direct' | 'group'; // NEW: only show add button for groups
  isWorkspaceChat: boolean; // NEW: don't show add button for workspace chats
  onClose: () => void;
  onMemberAdded?: () => void; // NEW: callback when member added successfully
}

export default function GroupParticipantsModal({
  visible,
  participants,
  currentUserId,
  conversationId,
  conversationType,
  isWorkspaceChat,
  onClose,
  onMemberAdded
}: GroupParticipantsModalProps) {
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Sort participants: current user first, then others alphabetically
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.uid === currentUserId) return -1;
    if (b.uid === currentUserId) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  // Can show add button if:
  // 1. It's a group chat (not direct)
  // 2. It's NOT a workspace chat (workspace chats have their own flow)
  const canAddMembers = conversationType === 'group' && !isWorkspaceChat;

  const handleAddMember = async () => {
    const email = memberEmail.trim().toLowerCase();

    // Validation
    if (!email) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsAddingMember(true);

    try {
      const result = await addMemberToGroupChat(conversationId, email);
      
      Alert.alert('Success', `Invitation sent to ${result.displayName}`);
      setMemberEmail('');
      setShowAddMemberModal(false);
      
      // Callback to refresh conversation data (though they won't appear until they accept)
      if (onMemberAdded) {
        onMemberAdded();
      }
    } catch (error: any) {
      const friendlyError = translateError(error);
      Alert.alert(friendlyError.title, friendlyError.message);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleClose = () => {
    setMemberEmail('');
    setShowAddMemberModal(false);
    onClose();
  };

  return (
    <>
      {/* Main participants modal */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={handleClose}
        >
          <View style={styles.modal} onStartShouldSetResponder={() => true}>
            <View style={styles.header}>
              <Text style={styles.title}>Group Members ({participants.length})</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
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

            {/* Add Member Button */}
            {canAddMembers && (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => setShowAddMemberModal(true)}
              >
                <Ionicons name="person-add-outline" size={20} color="#007AFF" />
                <Text style={styles.addButtonText}>Add Member</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        visible={showAddMemberModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddMemberModal(false)}
      >
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={() => setShowAddMemberModal(false)}
        >
          <View style={styles.addMemberModal} onStartShouldSetResponder={() => true}>
            <View style={styles.header}>
              <Text style={styles.title}>Add Member</Text>
              <TouchableOpacity 
                onPress={() => setShowAddMemberModal(false)} 
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.addMemberContent}>
              <Text style={styles.inputLabel}>Enter email address:</Text>
              <TextInput
                style={styles.emailInput}
                placeholder="user@example.com"
                value={memberEmail}
                onChangeText={setMemberEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isAddingMember}
              />

              <Text style={styles.helpText}>
                Later: phone number option will be available
              </Text>

              <View style={styles.addMemberButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowAddMemberModal(false)}
                  disabled={isAddingMember}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.confirmButton, isAddingMember && styles.confirmButtonDisabled]}
                  onPress={handleAddMember}
                  disabled={isAddingMember}
                >
                  {isAddingMember ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
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
  // NEW: Add Member Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  // NEW: Add Member Modal
  addMemberModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addMemberContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  addMemberButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#999',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

