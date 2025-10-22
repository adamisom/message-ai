import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  addDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import { db } from '../../firebase.config';
import { useAuthStore } from '../../store/authStore';
import MessageList from '../../components/MessageList';
import MessageInput from '../../components/MessageInput';
import OfflineBanner from '../../components/OfflineBanner';
import { MESSAGE_LIMIT, MESSAGE_TIMEOUT_MS } from '../../utils/constants';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: Date | { toDate: () => Date } | null;
  participants: string[];
  status?: 'sending' | 'sent' | 'failed' | 'queued';
}

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: string[];
  participantDetails: Record<string, { displayName: string; email: string }>;
}

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams();
  const { user } = useAuthStore();
  const navigation = useNavigation();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Track pending message timeouts
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  console.log('💬 [ChatScreen] Rendering, conversationId:', conversationId, 'messagesCount:', messages.length);

  // Update header title when conversation loads
  useEffect(() => {
    if (conversation && user) {
      let title = 'Chat';
      
      if (conversation.type === 'direct') {
        // Find the other user's name
        const otherUserId = conversation.participants.find(id => id !== user.uid);
        if (otherUserId && conversation.participantDetails[otherUserId]) {
          title = conversation.participantDetails[otherUserId].displayName;
        }
      } else {
        // Group chat with participant count
        const participantCount = conversation.participants.length;
        title = conversation.name || `Group (${participantCount} members)`;
      }
      
      console.log('📝 [ChatScreen] Setting header title:', title);
      navigation.setOptions({ title });
    }
  }, [conversation, user, navigation]);

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

  const handleTyping = () => {
    // Typing indicator logic will be added in Phase 5
    // For now, this is a no-op
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
      />
      <MessageInput
        onSend={sendMessage}
        onTyping={handleTyping}
        disabled={false} // Can send even when offline (will queue)
      />
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
