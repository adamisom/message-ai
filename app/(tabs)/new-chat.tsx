import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Button,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { createDirectMessageInvitation } from '../../services/dmInvitationService';
import {
    createGroupConversation,
    createOrOpenConversation,
    findUserByPhoneNumber
} from '../../services/firestoreService';
import { addMemberToGroupChat } from '../../services/groupChatService';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import type { User } from '../../types';
import { Alerts } from '../../utils/alerts';
import { Colors } from '../../utils/colors';
import { validatePhoneNumber } from '../../utils/validators';
import { extractDigits, formatPhoneNumber } from './new-chat-helpers';

export default function NewChat() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [validUsers, setValidUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { user } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();
  const router = useRouter();

  // Auto-detect chat type based on number of users
  const isGroupChat = validUsers.length >= 2;
  const canCreateChat = validUsers.length > 0;

  console.log('📝 [NewChat] Rendering, users:', validUsers.length, 'type:', isGroupChat ? 'group' : 'direct', 'workspace:', currentWorkspace?.name || 'none');

  const handleAddUser = async () => {
    setError('');
    setLoading(true);

    // Extract raw digits for validation and search
    const rawDigits = extractDigits(phoneNumber);
    console.log('🔍 [NewChat] Adding user with phone:', rawDigits);

    try {
      // Validate phone number format first
      if (!validatePhoneNumber(rawDigits)) {
        console.log('❌ [NewChat] Invalid phone number format');
        setError('Invalid phone number (must be 10 digits, US/Canada only)');
        return;
      }

      // Find user in Firestore by phone number
      const foundUser = await findUserByPhoneNumber(rawDigits);
      
      if (!foundUser) {
        console.log('❌ [NewChat] User not found');
        setError('No user found with that phone number');
        return;
      }

      // Check if it's the current user
      if (foundUser.uid === user?.uid) {
        console.log('❌ [NewChat] Cannot add self');
        setError("You can't add yourself");
        return;
      }

      // Check if already added
      if (validUsers.find(u => u.uid === foundUser.uid)) {
        console.log('❌ [NewChat] User already added');
        setError('User already added');
        return;
      }

      // Check group limit (25 members including self)
      if (validUsers.length >= 24) {
        console.log('❌ [NewChat] Group limit reached');
        setError('Maximum 25 members per group (including you)');
        return;
      }

      // Add to list
      console.log('✅ [NewChat] User added:', foundUser.displayName);
      setValidUsers([...validUsers, foundUser]);
      setPhoneNumber('');
      
    } catch (err: any) {
      console.error('❌ [NewChat] Error adding user:', err);
      setError(err.message || 'Failed to find user');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = (uid: string) => {
    console.log('➖ [NewChat] Removing user:', uid);
    setValidUsers(validUsers.filter(u => u.uid !== uid));
    setError(''); // Clear any errors when user count changes
  };

  const handleCreateChat = async () => {
    if (!canCreateChat) {
      setError('Please add at least one user');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    
    try {
      if (isGroupChat) {
        // Group chat: 2+ users
        console.log('👥 [NewChat] Creating group chat with', validUsers.length, 'users', currentWorkspace ? `in workspace: ${currentWorkspace.name}` : '(no workspace)');
        const conversationId = await createGroupConversation(
          validUsers, 
          user,
          currentWorkspace?.id,
          currentWorkspace?.name
        );
        
        // For non-workspace groups, send invitations to all members
        if (!currentWorkspace) {
          console.log('📨 [NewChat] Sending invitations to', validUsers.length, 'members');
          
          // Send invitations to all members
          const invitationPromises = validUsers.map(member =>
            addMemberToGroupChat(conversationId, member.email)
          );
          
          try {
            await Promise.all(invitationPromises);
            console.log('✅ [NewChat] All invitations sent successfully');
            
            setValidUsers([]); // Clear selected users
            
            Alerts.success(
              `Group chat created! Invitations sent to ${validUsers.length} member${validUsers.length > 1 ? 's' : ''}. They can accept from their invitations.`,
              () => router.push(`/chat/${conversationId}` as any)
            );
            return;
          } catch (inviteError: any) {
            console.error('❌ [NewChat] Error sending invitations:', inviteError);
            // Group was created but invitations failed - still navigate to chat
            Alerts.error(
              'Group chat created but some invitations failed to send. Please try adding members again.',
              () => router.push(`/chat/${conversationId}` as any)
            );
            return;
          }
        }
        
        // Workspace group: navigate directly (no invitations needed)
        console.log('✅ [NewChat] Workspace group chat created, navigating to:', conversationId);
        router.push(`/chat/${conversationId}` as any);
      } else {
        // Direct chat: 1 user
        const recipient = validUsers[0];
        console.log('💬 [NewChat] Creating direct chat', currentWorkspace ? `in workspace: ${currentWorkspace.name}` : '(no workspace)');
        
        // Check if recipient has private DM settings (requires invitation)
        if (!currentWorkspace && recipient.dmPrivacySetting === 'private') {
          console.log('🔒 [NewChat] Recipient has private DM settings, creating invitation');
          
          try {
            const result = await createDirectMessageInvitation(recipient.uid);
            setValidUsers([]); // Clear selected users after successful invitation
            Alerts.success(
              `Your message request has been sent to ${result.recipientName}. They can accept or decline it from their invitations.`,
              () => router.back()
            );
            return;
          } catch (inviteError: any) {
            // Handle specific error cases
            if (inviteError.message?.includes('already have a pending invitation')) {
              Alerts.error('You already have a pending invitation to this user');
              return;
            } else if (inviteError.message?.includes('Conversation already exists')) {
              Alerts.error('You can already message this user');
              return;
            } else if (inviteError.message?.includes('banned for spam')) {
              Alerts.error('You are temporarily unable to send invitations');
              return;
            }
            throw inviteError; // Re-throw other errors
          }
        }
        
        // Either workspace chat or public DM setting - create conversation directly
        const conversationId = await createOrOpenConversation(
          recipient, 
          user,
          currentWorkspace?.id,
          currentWorkspace?.name
        );
        console.log('✅ [NewChat] Direct chat created, navigating to:', conversationId);
        router.push(`/chat/${conversationId}` as any);
      }
    } catch (err: any) {
      console.error('❌ [NewChat] Error creating chat:', err);
      Alerts.error(err.message || 'Failed to create conversation');
    } finally {
      setLoading(false);
    }
  };

  // Generate dynamic button text based on context
  const getCreateButtonText = () => {
    if (loading) return 'Creating...';
    
    if (isGroupChat) {
      // Group chat: Show member count (including current user)
      return `Create Group (${validUsers.length + 1} members)`;
    } else {
      // Direct chat: Show recipient name
      return `Chat with ${validUsers[0]?.displayName || 'User'}`;
    }
  };

  return (
    <ErrorBoundary level="screen">
      <View style={styles.container}>
      {/* Phase 5: Workspace context banner */}
      {currentWorkspace && (
        <View style={styles.workspaceBanner}>
          <Text style={styles.workspaceBannerText}>
            Creating chat in: <Text style={styles.workspaceName}>{currentWorkspace.name}</Text>
          </Text>
        </View>
      )}
      
      {/* Auto-detect info banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>
          Add 1 person for direct chat, 2+ for group chat
        </Text>
      </View>

      {/* Phone number input */}
      <View style={styles.inputSection}>
        <TextInput
          style={styles.input}
          placeholder="Enter phone number"
          value={phoneNumber}
          onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
          keyboardType="phone-pad"
          editable={!loading}
          onSubmitEditing={handleAddUser}
          returnKeyType="done"
        />
        <Button
          title="Add User"
          onPress={handleAddUser}
          disabled={loading || !phoneNumber.trim()}
        />
      </View>

      {/* Error message */}
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}

      {/* List of added users */}
      {validUsers.length > 0 && (
        <View style={styles.usersList}>
          <Text style={styles.usersListTitle}>
            {isGroupChat ? `Group Members (${validUsers.length + 1}):` : 'Selected User:'}
          </Text>
          <FlatList
            data={validUsers}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
              <View style={styles.userItem}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.displayName}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveUser(item.uid)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      {/* Create button - auto-detects direct vs group */}
      {canCreateChat && (
        <View style={styles.createButtonSection}>
          <Button
            title={getCreateButtonText()}
            onPress={handleCreateChat}
            disabled={loading}
          />
        </View>
      )}
    </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  workspaceBanner: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  workspaceBannerText: {
    fontSize: 14,
    color: Colors.textMedium,
  },
  workspaceName: {
    fontWeight: '600',
    color: Colors.primary,
  },
  infoBanner: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoBannerText: {
    fontSize: 14,
    color: '#1976D2',
    textAlign: 'center',
  },
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  error: {
    color: 'red',
    fontSize: 14,
    marginBottom: 8,
  },
  usersList: {
    flex: 1,
    marginTop: 16,
  },
  usersListTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ff3b30',
    borderRadius: 4,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  createButtonSection: {
    marginTop: 16,
    paddingBottom: 16,
  },
});
