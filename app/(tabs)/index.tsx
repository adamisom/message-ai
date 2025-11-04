import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConversationItem from '../../components/ConversationItem';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { db } from '../../firebase.config';
import { scheduleMessageNotification } from '../../services/notificationService';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { UserStatusInfo } from '../../types';
import { Colors } from '../../utils/colors';

export default function ConversationsList() {
  const { user, loading } = useAuthStore();
  const { conversations, setConversations } = useChatStore();
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const router = useRouter();
  
  // Phase 5: Track online statuses for all conversation participants
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatusInfo>>({});
  
  // Phase 6: Track previous conversations to detect new messages
  const previousConversationsRef = useRef<Record<string, string>>({});
  
  // Track if initial load has completed
  const [isLoading, setIsLoading] = useState(true);

  console.log('📋 [ConversationsList] Rendering with', conversations.length, 'conversations, loading:', loading, 'user:', user?.uid, 'workspace:', currentWorkspace?.name || 'none');

  // Phase 5: Filter conversations by workspace
  // Phase C: Also filter out hidden conversations
  const filteredConversations = currentWorkspace
    ? conversations.filter(conv => {
        // Filter by workspace
        if (conv.workspaceId !== currentWorkspace.id) return false;
        // Filter out hidden conversations
        if (user?.hiddenConversations?.includes(conv.id)) return false;
        return true;
      })
    : conversations.filter(conv => {
        // Show only non-workspace chats when no workspace selected
        if (conv.workspaceId) return false;
        // Filter out hidden conversations
        if (user?.hiddenConversations?.includes(conv.id)) return false;
        return true;
      });

  console.log('🔍 [ConversationsList] After filtering:', filteredConversations.length, 'conversations');

  // Real-time listener for conversations
  useEffect(() => {
    // Wait for auth to finish loading AND user to be present
    if (loading || !user) {
      console.log('⚠️ [ConversationsList] Waiting for auth...', { loading, hasUser: !!user });
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
        
        // Mark loading as complete once we get first snapshot
        setIsLoading(false);
        
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
          const previousText = previousLastMessage || '';
          const currentText = currentLastMessage || '';
          
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
  }, [user, setConversations, loading]); // Include loading in deps array

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
  }, [user, conversations, loading]);

  return (
    <ErrorBoundary level="screen">
      <View style={styles.container}>
        {/* Phase 5: Workspace mode toggle */}
        {currentWorkspace && (
          <>
            {/* Unobtrusive hint at top */}
            <View style={styles.workspaceHint}>
              <Text style={styles.workspaceHintText}>
                Viewing Workspace Chats.{' '}
                <Text
                  style={styles.workspaceHintLink}
                  onPress={() => setCurrentWorkspace(null)}
                >
                  Click here
                </Text>
                {' '}for General Chat.
              </Text>
            </View>
            
            {/* Workspace banner with back button and name */}
            <View style={styles.workspaceBanner}>
              <TouchableOpacity
                onPress={() => router.push(`/workspaces` as any)}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color={Colors.primary} />
              </TouchableOpacity>
              <View style={styles.workspaceBannerContent}>
                <Ionicons name="business" size={20} color={Colors.primary} />
                <Text style={styles.workspaceBannerText}>
                  {currentWorkspace.name}
                </Text>
              </View>
            </View>
          </>
        )}
        
        {isLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading conversations...</Text>
          </View>
        ) : filteredConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {currentWorkspace
                ? `No chats in ${currentWorkspace.name} yet`
                : 'No conversations yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {currentWorkspace
                ? 'Start a conversation with workspace members'
                : 'Tap "New Chat" to start a conversation'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredConversations}
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
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  workspaceHint: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  workspaceHintText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
  },
  workspaceHintLink: {
    color: '#5B8DBE',
  },
  workspaceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  workspaceBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  workspaceBannerText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
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

