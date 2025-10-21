import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect } from 'react';
import { Button, FlatList, StyleSheet, Text, View } from 'react-native';
import ConversationItem from '../../components/ConversationItem';
import { db } from '../../firebase.config';
import { logoutUser } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';

export default function ConversationsList() {
  const { user, logout } = useAuthStore();
  const { conversations, setConversations } = useChatStore();
  const router = useRouter();

  console.log('📋 [ConversationsList] Rendering with', conversations.length, 'conversations');

  // Real-time listener for conversations
  useEffect(() => {
    if (!user) {
      console.log('⚠️ [ConversationsList] No user, skipping listener setup');
      return;
    }

    console.log('👂 [ConversationsList] Setting up real-time listener for user:', user.uid);

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        console.log('📬 [ConversationsList] Received', snapshot.docs.length, 'conversations from Firestore');
        
        const convos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as any));
        
        // Sort: new conversations (null lastMessageAt) appear at top
        const sorted = convos.sort((a: any, b: any) => {
          if (!a.lastMessageAt && !b.lastMessageAt) return 0;
          if (!a.lastMessageAt) return -1; // a goes first
          if (!b.lastMessageAt) return 1;  // b goes first
          // Both have timestamps, Firestore already sorted desc
          return 0;
        });
        
        setConversations(sorted);
      },
      (error) => {
        console.error('❌ [ConversationsList] Listener error:', error);
        // If Firestore index is needed, the error message will include a link
        if (error.message && error.message.includes('index')) {
          console.error('⚠️ FIRESTORE INDEX REQUIRED - See error above for auto-creation link');
        }
      }
    );

    // CRITICAL: Always unsubscribe on unmount
    return () => {
      console.log('🔌 [ConversationsList] Cleaning up listener');
      unsubscribe();
    };
  }, [user, setConversations]);

  const handleLogout = async () => {
    console.log('👋 [ConversationsList] Logging out');
    await logoutUser();
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button title="Logout" onPress={handleLogout} />
      </View>
      
      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>
            Tap &quot;New Chat&quot; to start a conversation
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              currentUserId={user?.uid || ''}
              onPress={() => {
                console.log('🔗 [ConversationsList] Navigating to chat:', item.id);
                router.push(`/chat/${item.id}` as any);
              }}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

