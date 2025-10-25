import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Button, FlatList, StyleSheet, Text, View } from 'react-native';
import ConversationItem from '../../components/ConversationItem';
import { db } from '../../firebase.config';
import { logoutUser } from '../../services/authService';
import { scheduleMessageNotification } from '../../services/notificationService';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { UserStatusInfo } from '../../types';

export default function ConversationsList() {
  const { user, logout } = useAuthStore();
  const { conversations, setConversations } = useChatStore();
  const router = useRouter();
  
  // Phase 5: Track online statuses for all conversation participants
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatusInfo>>({});
  
  // Phase 6: Track previous conversations to detect new messages
  const previousConversationsRef = useRef<Record<string, string>>({});

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
        
        // Phase 6: Check for new messages and trigger notifications
        convos.forEach((convo: any) => {
          const previousLastMessage = previousConversationsRef.current[convo.id];
          const currentLastMessage = convo.lastMessage;
          
          // Initialize the ref for this conversation if this is the first time we're seeing it
          // This prevents notifications from triggering on app launch for existing messages
          const isFirstLoad = !(convo.id in previousConversationsRef.current);
          
          // Compare by text content to avoid object reference issues
          // Handle both string and object formats for lastMessage
          const previousText = !previousLastMessage 
            ? ''
            : typeof previousLastMessage === 'string' 
            ? previousLastMessage 
            : (previousLastMessage as {text: string}).text || '';
          const currentText = !currentLastMessage
            ? ''
            : typeof currentLastMessage === 'string'
            ? currentLastMessage
            : (currentLastMessage as {text: string}).text || '';
          
          // Only notify if:
          // 1. There's a current last message
          // 2. This is NOT the first load (we've seen this conversation before)
          // 3. The message text has changed from the previous one
          // 4. The message is not from the current user
          if (
            currentLastMessage && 
            !isFirstLoad &&
            currentText !== previousText &&
            convo.lastMessageSenderId !== user.uid
          ) {
            console.log('🔔 [ConversationsList] New message in conversation:', convo.id);
            
            // Get sender name
            const senderName = convo.participantDetails[convo.lastMessageSenderId]?.displayName || 'Someone';
            
            scheduleMessageNotification(
              senderName,
              currentText,
              convo.id
            );
          }
          
          // Update the reference
          previousConversationsRef.current[convo.id] = currentLastMessage;
        });
        
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

  // Phase 5: Listen to participant statuses
  useEffect(() => {
    if (!user || conversations.length === 0) return;

    console.log('👂 [ConversationsList] Setting up status listeners');

    // Collect all unique participant IDs (excluding current user)
    const participantIds = new Set<string>();
    conversations.forEach(convo => {
      convo.participants.forEach(participantId => {
        if (participantId !== user.uid) {
          participantIds.add(participantId);
        }
      });
    });

    console.log('👥 [ConversationsList] Listening to statuses for', participantIds.size, 'users');

    // Set up listener for each participant
    const unsubscribes = Array.from(participantIds).map(participantId => {
      return onSnapshot(doc(db, 'users', participantId), (docSnapshot) => {
        if (docSnapshot.exists()) {
          setUserStatuses(prev => ({
            ...prev,
            [participantId]: {
              isOnline: docSnapshot.data().isOnline || false,
              lastSeenAt: docSnapshot.data().lastSeenAt,
            },
          }));
        }
      });
    });

    // Cleanup all listeners
    return () => {
      console.log('🔌 [ConversationsList] Cleaning up status listeners');
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, conversations]);

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
              userStatuses={userStatuses}
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

