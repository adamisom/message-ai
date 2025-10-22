import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Button,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {
    createGroupConversation,
    createOrOpenConversation,
    findUserByEmail
} from '../../services/firestoreService';
import { useAuthStore } from '../../store/authStore';
import { validateEmail } from '../../utils/validators';

interface User {
  uid: string;
  email: string;
  displayName: string;
}

export default function NewChat() {
  const [email, setEmail] = useState('');
  const [validUsers, setValidUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGroupMode, setIsGroupMode] = useState(false);

  const { user } = useAuthStore();
  const router = useRouter();

  console.log('📝 [NewChat] Rendering, mode:', isGroupMode ? 'group' : 'direct', 'users:', validUsers.length);

  const handleAddUser = async () => {
    setError('');
    setLoading(true);

    console.log('🔍 [NewChat] Adding user with email:', email);

    try {
      // Validate email format first
      if (!validateEmail(email)) {
        console.log('❌ [NewChat] Invalid email format');
        setError('Invalid email format');
        return;
      }

      // Find user in Firestore
      const foundUser = await findUserByEmail(email);
      
      if (!foundUser) {
        console.log('❌ [NewChat] User not found');
        setError('No user found with that email');
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

      // Add to list
      console.log('✅ [NewChat] User added:', foundUser.displayName);
      setValidUsers([...validUsers, foundUser]);
      setEmail('');
      
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
  };

  const handleCreateDirectChat = async () => {
    if (validUsers.length === 0) {
      setError('Please add at least one user');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    console.log('💬 [NewChat] Creating direct chat');
    
    try {
      const conversationId = await createOrOpenConversation(
        validUsers[0], 
        user
      );
      console.log('✅ [NewChat] Direct chat created, navigating to:', conversationId);
      router.push(`/chat/${conversationId}` as any);
    } catch (err: any) {
      console.error('❌ [NewChat] Error creating direct chat:', err);
      Alert.alert('Error', err.message || 'Failed to create conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroupChat = async () => {
    if (validUsers.length < 2) {
      setError('Need at least 2 users for a group chat');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    console.log('👥 [NewChat] Creating group chat with', validUsers.length, 'users');
    
    try {
      const conversationId = await createGroupConversation(validUsers, user);
      console.log('✅ [NewChat] Group chat created, navigating to:', conversationId);
      router.push(`/chat/${conversationId}` as any);
    } catch (err: any) {
      console.error('❌ [NewChat] Error creating group chat:', err);
      Alert.alert('Error', err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleModeToggle = () => {
    console.log('🔄 [NewChat] Toggling mode from', isGroupMode ? 'group' : 'direct', 'to', !isGroupMode ? 'group' : 'direct');
    
    // If users have been added, confirm before switching
    if (validUsers.length > 0) {
      Alert.alert(
        'Switch Chat Mode?',
        'Switching modes will clear your selected users. Continue?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Switch',
            onPress: () => {
              console.log('✅ [NewChat] Mode switch confirmed');
              setIsGroupMode(!isGroupMode);
              setValidUsers([]);
              setError('');
            },
            style: 'destructive'
          }
        ]
      );
    } else {
      setIsGroupMode(!isGroupMode);
      setError('');
    }
  };

  return (
    <View style={styles.container}>
      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        <Button
          title={isGroupMode ? 'Switch to Direct Chat' : 'Switch to Group Chat'}
          onPress={handleModeToggle}
        />
      </View>

      {/* Email input */}
      <View style={styles.inputSection}>
        <TextInput
          style={styles.input}
          placeholder="Enter email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!loading}
        />
        <Button
          title={isGroupMode ? 'Add User' : 'Find User'}
          onPress={handleAddUser}
          disabled={loading || !email.trim()}
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
            {isGroupMode ? 'Group Members:' : 'Selected User:'}
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

      {/* Create button */}
      {validUsers.length > 0 && (
        <View style={styles.createButtonSection}>
          <Button
            title={
              loading
                ? 'Creating...'
                : isGroupMode
                ? `Create Group (${validUsers.length + 1} members)`
                : 'Create Chat'
            }
            onPress={isGroupMode ? handleCreateGroupChat : handleCreateDirectChat}
            disabled={loading}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  modeToggle: {
    marginBottom: 16,
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

