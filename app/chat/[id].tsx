import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc
} from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GroupParticipantsModal from '../../components/GroupParticipantsModal';
import MessageInput from '../../components/MessageInput';
import MessageList from '../../components/MessageList';
import OfflineBanner from '../../components/OfflineBanner';
import TypingIndicator from '../../components/TypingIndicator';
import UserStatusBadge from '../../components/UserStatusBadge';
import { db } from '../../firebase.config';
import { useAuthStore } from '../../store/authStore';
import { Message, Conversation, TypingUser, UserStatusInfo } from '../../types';
import { MESSAGE_LIMIT, MESSAGE_TIMEOUT_MS, TYPING_DEBOUNCE_MS } from '../../utils/constants';

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams();
  const { user } = useAuthStore();
  const navigation = useNavigation();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  
  // Phase 5: Typing indicators
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const lastTypingWriteRef = useRef<number>(0);
  
  // Phase 5: Online status tracking
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatusInfo>>({});
  
  // Phase 5: Read receipts tracking
  const lastMarkedReadRef = useRef<string | null>(null);

  // Track pending message timeouts
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  console.log('💬 [ChatScreen] Rendering, conversationId:', conversationId, 'messagesCount:', messages.length);

  // Phase 5: Listen to participant statuses
  useEffect(() => {
    if (!conversation || !user) return;

    const otherParticipants = conversation.participants.filter(id => id !== user.uid);
    
    console.log('👂 [ChatScreen] Setting up status listeners for', otherParticipants.length, 'participants');
    
    const unsubscribes = otherParticipants.map(participantId => {
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

    return () => {
      console.log('🔌 [ChatScreen] Cleaning up status listeners');
      unsubscribes.forEach(unsub => unsub());
    };
  }, [conversation, user]);

  // Update header title when conversation loads (Phase 4 + Phase 5: added status badge)
  useEffect(() => {
    if (conversation && user) {
      let title = 'Chat';
      let headerRight = undefined;
      
      if (conversation.type === 'direct') {
        // Find the other user's name
        const otherUserId = conversation.participants.find(id => id !== user.uid);
        if (otherUserId && conversation.participantDetails[otherUserId]) {
          title = conversation.participantDetails[otherUserId].displayName;
          
          // Phase 5: Add status badge for direct chats
          const status = userStatuses[otherUserId];
          if (status) {
            headerRight = () => (
              <View style={{ marginRight: 16 }}>
                <UserStatusBadge 
                  isOnline={status.isOnline} 
                  lastSeenAt={status.lastSeenAt}
                  showText={true}
                />
              </View>
            );
          }
        }
      } else {
        // Group chat with participant count (from Phase 4) + info button
        const participantCount = conversation.participants.length;
        title = conversation.name || `Group (${participantCount} members)`;
        
        // Add info button for group participants
        headerRight = () => (
          <TouchableOpacity 
            onPress={() => setShowParticipantsModal(true)}
            style={{ marginRight: 16 }}
          >
            <Ionicons name="information-circle-outline" size={28} color="#007AFF" />
          </TouchableOpacity>
        );
      }
      
      console.log('📝 [ChatScreen] Setting header title:', title);
      navigation.setOptions({ title, headerRight });
    }
  }, [conversation, user, userStatuses, navigation]);

  // Listen to network status
  useEffect(() => {
    console.log('🌐 [ChatScreen] Setting up network listener');
    
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
      console.log('🌐 [ChatScreen] Network status:', state.isConnected ? 'ONLINE' : 'OFFLINE');
    });
    
    return () => {
      console.log('🔌 [ChatScreen] Cleaning up network listener');
      unsubscribe();
    };
  }, []);

  // Listen to conversation details
  useEffect(() => {
    if (!conversationId || typeof conversationId !== 'string') {
      console.log('⚠️ [ChatScreen] Invalid conversationId');
      return;
    }

    console.log('👂 [ChatScreen] Setting up conversation listener');

    const unsubscribe = onSnapshot(
      doc(db, 'conversations', conversationId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          console.log('✅ [ChatScreen] Conversation loaded');
          setConversation({
            id: docSnapshot.id,
            ...docSnapshot.data(),
          } as Conversation);
        } else {
          console.log('❌ [ChatScreen] Conversation not found');
        }
      }
    );

    return () => {
      console.log('🔌 [ChatScreen] Cleaning up conversation listener');
      unsubscribe();
    };
  }, [conversationId]);

  // Listen to messages (last 100)
  useEffect(() => {
    if (!conversationId || typeof conversationId !== 'string') return;

    console.log('👂 [ChatScreen] Setting up messages listener');

    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(MESSAGE_LIMIT)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('📬 [ChatScreen] Received', snapshot.docs.length, 'messages from Firestore');
      
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error('❌ [ChatScreen] Messages listener error:', error);
      // If index is required, error will contain a link to create it
      if (error.message && error.message.includes('index')) {
        console.error('⚠️ FIRESTORE INDEX REQUIRED - See error above for a link to create it.');
      }
      setLoading(false);
    });

    return () => {
      console.log('🔌 [ChatScreen] Cleaning up messages listener');
      unsubscribe();
    };
  }, [conversationId]);

  // Phase 5: Listen to typing indicators
  useEffect(() => {
    if (!conversationId || typeof conversationId !== 'string' || !user) return;

    console.log('👂 [ChatScreen] Setting up typing indicators listener');

    const typingRef = collection(db, 'conversations', conversationId, 'typingUsers');
    
    const unsubscribe = onSnapshot(typingRef, (snapshot) => {
      const typing = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() }))
        .filter(t => t.uid !== user.uid) as TypingUser[];
      
      console.log('⌨️ [ChatScreen] Typing users:', typing.length);
      setTypingUsers(typing);
    });

    return () => {
      console.log('🔌 [ChatScreen] Cleaning up typing indicators listener');
      unsubscribe();
    };
  }, [conversationId, user]);

  // Phase 5: Mark messages as read
  useEffect(() => {
    if (messages.length === 0 || !user || typeof conversationId !== 'string') return;

    // Get the last message
    const lastMessage = messages[messages.length - 1];
    
    // Only mark as read if it's a different message than what we last marked
    // (Mark ALL messages as read, including our own, to clear unread indicators)
    if (lastMessage.id !== lastMarkedReadRef.current) {
      lastMarkedReadRef.current = lastMessage.id;
      
      console.log('✓✓ [ChatScreen] Marking conversation as read up to:', lastMessage.id);
      
      updateDoc(doc(db, 'conversations', conversationId), {
        [`lastRead.${user.uid}`]: lastMessage.id,
      }).catch(error => {
        console.error('❌ [ChatScreen] Error updating last read:', error);
      });
    }
  }, [messages, user, conversationId]);

  const sendMessage = async (text: string) => {
    if (!conversation || !user || typeof conversationId !== 'string') {
      console.log('⚠️ [ChatScreen] Cannot send message - missing conversation or user');
      return;
    }

    // Generate temp ID for optimistic update
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const senderName = user.displayName || user.email || 'Unknown User';
    
    console.log('📤 [ChatScreen] Sending message (tempId:', tempId, ')');
    
    const tempMessage: Message = {
      id: tempId,
      text,
      senderId: user.uid,
      senderName,
      createdAt: new Date(),
      participants: conversation.participants,
      status: isOnline ? 'sending' : 'queued',
    };

    // Optimistic update: Add temp message immediately
    setMessages(prev => [...prev, tempMessage]);

    // Set timeout for failure detection (10 seconds)
    const timeout = setTimeout(() => {
      console.log('⏰ [ChatScreen] Message timeout for:', tempId);
      updateMessageStatus(tempId, 'failed');
      timeoutRefs.current.delete(tempId);
    }, MESSAGE_TIMEOUT_MS);

    timeoutRefs.current.set(tempId, timeout);

    try {
      // Write to Firestore
      const messageRef = await addDoc(
        collection(db, 'conversations', conversationId, 'messages'),
        {
          text,
          senderId: user.uid,
          senderName,
          participants: conversation.participants,
          createdAt: serverTimestamp(),
        }
      );

      console.log('✅ [ChatScreen] Message sent to Firestore:', messageRef.id);

      // Clear timeout (message succeeded)
      const existingTimeout = timeoutRefs.current.get(tempId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        timeoutRefs.current.delete(tempId);
      }

      // Update conversation's lastMessage
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: text.substring(0, 100),
        lastMessageAt: serverTimestamp(),
      });

      console.log('✅ [ChatScreen] Conversation lastMessage updated');

      // Remove temp message (real one will appear via listener)
      setMessages(prev => prev.filter(m => m.id !== tempId));

    } catch (error) {
      console.error('❌ [ChatScreen] Send message error:', error);
      
      // Clear timeout
      const existingTimeout = timeoutRefs.current.get(tempId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        timeoutRefs.current.delete(tempId);
      }

      // Mark as failed
      updateMessageStatus(tempId, 'failed');
    }
  };

  const updateMessageStatus = (messageId: string, status: 'sending' | 'sent' | 'failed' | 'queued') => {
    console.log('🔄 [ChatScreen] Updating message status:', messageId, '→', status);
    setMessages(prev => 
      prev.map(m => m.id === messageId ? { ...m, status } : m)
    );
  };

  // Phase 5: Typing indicator handlers
  const handleTyping = async () => {
    if (!conversationId || typeof conversationId !== 'string' || !user) return;
    
    // Debounce: only write if TYPING_DEBOUNCE_MS has passed since last write
    const now = Date.now();
    if (lastTypingWriteRef.current && now - lastTypingWriteRef.current < TYPING_DEBOUNCE_MS) {
      return;  // Skip write, too soon since last write
    }
    
    lastTypingWriteRef.current = now;
    
    try {
      await setDoc(
        doc(db, 'conversations', conversationId, 'typingUsers', user.uid),
        {
          uid: user.uid,
          displayName: user.displayName || user.email || 'Unknown',
          at: serverTimestamp(),
        }
      );
    } catch (error) {
      console.error('❌ [ChatScreen] Error setting typing status:', error);
    }
  };

  const handleStopTyping = async () => {
    if (!conversationId || typeof conversationId !== 'string' || !user) return;
    
    try {
      await deleteDoc(
        doc(db, 'conversations', conversationId, 'typingUsers', user.uid)
      );
    } catch (error) {
      console.error('❌ [ChatScreen] Error clearing typing status:', error);
    }
  };

  // Phase 5: Read status calculation
  const getMessageTime = (msg: Message): number | undefined => {
    if (!msg.createdAt) return undefined;
    if (msg.createdAt instanceof Date) return msg.createdAt.getTime();
    if (typeof msg.createdAt.toDate === 'function') return msg.createdAt.toDate().getTime();
    return undefined;
  };

  const getReadStatus = (message: Message): '✓' | '✓✓' | null => {
    // Only show status for own messages
    if (message.senderId !== user?.uid || !conversation) return null;

    if (conversation.type === 'direct') {
      // Direct chat: simple ✓ or ✓✓
      const otherUserId = conversation.participants.find(id => id !== user.uid);
      if (!otherUserId) return '✓';

      const lastRead = conversation.lastRead?.[otherUserId];
      if (!lastRead) return '✓'; // Not read yet

      // Find the last read message
      const lastReadMsg = messages.find(m => m.id === lastRead);
      if (!lastReadMsg) return '✓';

      // Compare timestamps using normalized extraction
      const messageTime = getMessageTime(message);
      const lastReadTime = getMessageTime(lastReadMsg);

      return messageTime && lastReadTime && messageTime <= lastReadTime ? '✓✓' : '✓';
    } else {
      // Group chat: show ✓✓ if all members have read
      const otherParticipants = conversation.participants.filter(id => id !== user.uid);
      let readCount = 0;

      otherParticipants.forEach(participantId => {
        const lastRead = conversation.lastRead?.[participantId];
        if (lastRead) {
          const lastReadMsg = messages.find(m => m.id === lastRead);
          if (lastReadMsg) {
            const messageTime = getMessageTime(message);
            const lastReadTime = getMessageTime(lastReadMsg);

            if (messageTime && lastReadTime && messageTime <= lastReadTime) {
              readCount++;
            }
          }
        }
      });

      // Show ✓✓ only if ALL members have read
      return readCount === otherParticipants.length ? '✓✓' : '✓';
    }
  };

  // Cleanup all timeouts on unmount
  useEffect(() => {
    const timeouts = timeoutRefs.current;
    
    return () => {
      console.log('🧹 [ChatScreen] Cleaning up all message timeouts');
      timeouts.forEach(timeout => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={styles.errorContainer}>
        <Text>Conversation not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <MessageList
        messages={messages}
        currentUserId={user?.uid || ''}
        conversationType={conversation.type}
        getReadStatus={getReadStatus}
      />
      <TypingIndicator typingUsers={typingUsers} />
      <MessageInput
        onSend={sendMessage}
        onTyping={handleTyping}
        onStopTyping={handleStopTyping}
        disabled={false} // Can send even when offline (will queue)
      />
      
      {/* Group Participants Modal */}
      {conversation.type === 'group' && (
        <GroupParticipantsModal
          visible={showParticipantsModal}
          participants={Object.entries(conversation.participantDetails).map(([uid, details]) => ({
            uid,
            displayName: details.displayName,
            email: details.email,
          }))}
          onClose={() => setShowParticipantsModal(false)}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
