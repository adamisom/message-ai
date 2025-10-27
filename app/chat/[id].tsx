import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    startAfter,
    updateDoc
} from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AIFeaturesMenu } from '../../components/AIFeaturesMenu';
import { ActionItemsModal } from '../../components/ActionItemsModal';
import { DecisionsModal } from '../../components/DecisionsModal';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import GroupParticipantsModal from '../../components/GroupParticipantsModal';
import { MeetingSchedulerModal } from '../../components/MeetingSchedulerModal';
import MessageInput from '../../components/MessageInput';
import MessageList, { MessageListRef } from '../../components/MessageList';
import OfflineBanner from '../../components/OfflineBanner';
import { SearchModal } from '../../components/SearchModal';
import { SummaryModal } from '../../components/SummaryModal';
import TypingIndicator from '../../components/TypingIndicator';
import { UpgradeToProModal } from '../../components/UpgradeToProModal';
import UserStatusBadge from '../../components/UserStatusBadge';
import { db } from '../../firebase.config';
import { FailedMessagesService } from '../../services/failedMessagesService';
import { reportDirectMessageSpam } from '../../services/groupChatService';
import { useAuthStore } from '../../store/authStore';
import { Conversation, Message, TypingUser, UserStatusInfo } from '../../types';
import { Workspace } from '../../types/workspace';
import { MESSAGE_LIMIT, MESSAGE_TIMEOUT_MS, TYPING_DEBOUNCE_MS } from '../../utils/constants';
import { ErrorLogger } from '../../utils/errorLogger';

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams();
  const { user, refreshUserProfile } = useAuthStore();
  const navigation = useNavigation();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [canAccessAI, setCanAccessAI] = useState(false); // AI access control
  
  // Pagination state
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const oldestMessageRef = useRef<any>(null); // Track oldest message for pagination
  const paginationLockRef = useRef(false); // Prevent concurrent pagination calls
  const unsubscribeRef = useRef<(() => void) | null>(null); // Store listener unsubscribe function
  const [showScrollToBottom, setShowScrollToBottom] = useState(false); // Show jump to bottom button
  const [isPaginationMode, setIsPaginationMode] = useState(false); // Track if we're in pagination mode
  
  // AI Features Modals
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showActionItemsModal, setShowActionItemsModal] = useState(false);
  const [showDecisionsModal, setShowDecisionsModal] = useState(false);
  const [showMeetingSchedulerModal, setShowMeetingSchedulerModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Jump to message functionality
  const messageListRef = useRef<MessageListRef>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  
  // Phase 5: Typing indicators
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const lastTypingWriteRef = useRef<number>(0);
  
  // Phase 5: Online status tracking
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatusInfo>>({});
  
  // Phase 5: Read receipts tracking
  const lastMarkedReadRef = useRef<string | null>(null);
  
  // Phase C: Blocked user check
  const [isBlockedByRecipient, setIsBlockedByRecipient] = useState(false);

  // Sub-Phase 7: Workspace admin features
  const [showMessageToolbar, setShowMessageToolbar] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCapacityModal, setShowCapacityModal] = useState(false);

  // Track pending message timeouts
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  console.log('💬 [ChatScreen] Rendering, conversationId:', conversationId, 'messagesCount:', messages.length);

  // Check AI access based on user subscription, trial, or workspace membership
  useEffect(() => {
    if (!user || !conversation) {
      setCanAccessAI(false);
      return;
    }

    const checkAIAccess = () => {
      // Pro users always have access
      if (user.isPaidUser === true) {
        setCanAccessAI(true);
        return;
      }

      // Check if user is in active trial
      if (user.trialEndsAt) {
        const now = Date.now();
        const trialEndsAt = typeof user.trialEndsAt === 'number' 
          ? user.trialEndsAt 
          : user.trialEndsAt.toMillis?.() || 0;
        
        if (now < trialEndsAt) {
          setCanAccessAI(true);
          return;
        }
      }

      // Free users (after trial) can only access AI in workspace chats
      if (conversation.workspaceId) {
        setCanAccessAI(true);
        return;
      }

      // No access: not Pro, trial expired, and not in workspace
      setCanAccessAI(false);
    };

    checkAIAccess();
  }, [user, conversation]);
  
  // Phase C: Check if current user is blocked by the recipient (direct messages only)
  useEffect(() => {
    if (!user || !conversation || conversation.type !== 'direct') {
      setIsBlockedByRecipient(false);
      return;
    }

    const otherParticipantId = conversation.participants.find(id => id !== user.uid);
    if (!otherParticipantId) {
      setIsBlockedByRecipient(false);
      return;
    }

    console.log('🚫 [ChatScreen] Checking if blocked by:', otherParticipantId);

    // Listen to the other participant's blockedUsers array
    const unsubscribe = onSnapshot(
      doc(db, 'users', otherParticipantId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const blockedUsers = docSnapshot.data().blockedUsers || [];
          const isBlocked = blockedUsers.includes(user.uid);
          console.log('🚫 [ChatScreen] Blocked status:', isBlocked);
          setIsBlockedByRecipient(isBlocked);
        } else {
          setIsBlockedByRecipient(false);
        }
      },
      (error) => {
        console.error('❌ [ChatScreen] Error listening to blocked status:', error);
        setIsBlockedByRecipient(false);
      }
    );

    return () => unsubscribe();
  }, [user, conversation]);

  // Helper: Deduplicate messages by ID (safety net for race conditions)
  const deduplicateMessages = (msgs: Message[]): Message[] => {
    const seen = new Set<string>();
    return msgs.filter(msg => {
      if (seen.has(msg.id)) {
        console.warn('⚠️ [deduplicateMessages] Removed duplicate:', msg.id);
        return false;
      }
      seen.add(msg.id);
      return true;
    });
  };

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
          
          // Phase 5: Add status badge and info button for direct chats
          const status = userStatuses[otherUserId];
          headerRight = () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 12 }}>
              {status && (
                <UserStatusBadge 
                  isOnline={status.isOnline} 
                  lastSeenAt={status.lastSeenAt}
                  showText={true}
                />
              )}
              <TouchableOpacity onPress={() => setShowAIMenu(true)}>
                <Ionicons name="sparkles-outline" size={24} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowParticipantsModal(true)}>
                <Ionicons name="information-circle-outline" size={28} color="#007AFF" />
              </TouchableOpacity>
            </View>
          );
        }
      } else {
        // Group chat with participant count (from Phase 4) + info button
        const participantCount = conversation.participants.length;
        title = conversation.name || `Group (${participantCount} members)`;
        
        // Add info button for group participants + AI features
        headerRight = () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 12 }}>
            <TouchableOpacity onPress={() => setShowAIMenu(true)}>
              <Ionicons name="sparkles-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowParticipantsModal(true)}>
              <Ionicons name="information-circle-outline" size={28} color="#007AFF" />
            </TouchableOpacity>
          </View>
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

  // Listen to messages (with pagination support)
  useEffect(() => {
    if (!conversationId || typeof conversationId !== 'string' || !user) return;
    
    // Skip if we're in pagination mode (listener already stopped)
    if (isPaginationMode) {
      console.log('⏭️ [ChatScreen] In pagination mode, skipping listener setup');
      return;
    }

    console.log('👂 [ChatScreen] Setting up messages listener (last 100 messages)');

    // Query for the LAST 100 messages (most recent)
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'desc'), // Descending order to get most recent first
      limit(MESSAGE_LIMIT)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // CRITICAL: If pagination mode was enabled while this callback was pending, ignore it
      if (isPaginationMode) {
        console.log('⚠️ [ChatScreen] Pagination mode active, ignoring listener update');
        return;
      }
      
      console.log('📬 [ChatScreen] Received', snapshot.docs.length, 'messages from Firestore');
      
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      // For inverted FlatList: keep DESC order (newest first)
      // FlatList will render them inverted so newest appears at bottom of screen

      // Deduplicate messages (safety net for race conditions)
      const uniqueMsgs = deduplicateMessages(msgs);

      // Track the oldest message for pagination
      if (snapshot.docs.length > 0) {
        oldestMessageRef.current = snapshot.docs[snapshot.docs.length - 1]; // Last doc in desc order = oldest message
      }

      // If we got fewer messages than the limit, there are no more older messages
      setHasMoreMessages(snapshot.docs.length === MESSAGE_LIMIT);

      setMessages(uniqueMsgs);
      setLoading(false);
    }, (error) => {
      console.error('❌ [ChatScreen] Messages listener error:', error);
      if (error.message && error.message.includes('index')) {
        console.error('⚠️ FIRESTORE INDEX REQUIRED - See error above for a link to create it.');
      }
      setLoading(false);
    });

    // Store unsubscribe function for later use
    unsubscribeRef.current = unsubscribe;

    return () => {
      console.log('🔌 [ChatScreen] Cleaning up messages listener');
      unsubscribe();
    };
  }, [conversationId, user, isPaginationMode]);

  // Phase 5: Listen to typing indicators
  useEffect(() => {
    if (!conversationId || typeof conversationId !== 'string' || !user) return;

    console.log('👂 [ChatScreen] Setting up typing indicators listener');

    const typingRef = collection(db, 'conversations', conversationId, 'typingUsers');
    
    // Track typing users with their last update time
    const typingUsersMap = new Map<string, { user: TypingUser; lastUpdate: number; timer: ReturnType<typeof setTimeout> }>();
    
    const unsubscribe = onSnapshot(typingRef, (snapshot) => {
      const now = Date.now();
      
      // Process current typing users from Firestore
      snapshot.docs.forEach(doc => {
        const typingUser = { uid: doc.id, ...doc.data() } as TypingUser;
        if (typingUser.uid === user.uid) return; // Skip own typing
        
        // Clear existing timer if any
        const existing = typingUsersMap.get(typingUser.uid);
        if (existing?.timer) {
          clearTimeout(existing.timer);
        }
        
        // Set new timer to remove after 2 seconds
        const timer = setTimeout(() => {
          console.log('⌨️ [ChatScreen] Removing stale typing indicator:', typingUser.displayName);
          typingUsersMap.delete(typingUser.uid);
          updateTypingState();
        }, 2000);
        
        typingUsersMap.set(typingUser.uid, {
          user: typingUser,
          lastUpdate: now,
          timer
        });
      });
      
      // Check for users who were removed from Firestore but should still show for a bit
      // (This handles the case where sender stopped typing and deleted their doc)
      typingUsersMap.forEach((data, uid) => {
        const existsInSnapshot = snapshot.docs.some(doc => doc.id === uid);
        if (!existsInSnapshot && now - data.lastUpdate < 2000) {
          // User was removed from Firestore but was recently typing - keep showing for full 2 seconds
          console.log('⌨️ [ChatScreen] Keeping recently removed typing indicator:', data.user.displayName);
        } else if (!existsInSnapshot && now - data.lastUpdate >= 2000) {
          // It's been 2 seconds, safe to remove
          if (data.timer) clearTimeout(data.timer);
          typingUsersMap.delete(uid);
        }
      });
      
      updateTypingState();
    });
    
    const updateTypingState = () => {
      const currentlyTyping = Array.from(typingUsersMap.values()).map(data => data.user);
      console.log('⌨️ [ChatScreen] Typing users:', currentlyTyping.length);
      setTypingUsers(currentlyTyping);
    };

    return () => {
      console.log('🔌 [ChatScreen] Cleaning up typing indicators listener');
      // Clear all timers
      typingUsersMap.forEach(data => {
        if (data.timer) clearTimeout(data.timer);
      });
      typingUsersMap.clear();
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
        [`lastReadAt.${user.uid}`]: serverTimestamp(), // Add timestamp for comparison
      }).catch(error => {
        console.error('❌ [ChatScreen] Error updating last read:', error);
      });
    }
  }, [messages, user, conversationId]);

  // Scroll away from bottom handler - show button
  const handleScrollAwayFromBottom = () => {
    console.log('⬆️ [handleScrollAwayFromBottom] User scrolled away, showing button');
    setShowScrollToBottom(true);
  };

  // Scroll to bottom and re-enable real-time listener
  const handleScrollToBottom = async () => {
    console.log('⬇️ [handleScrollToBottom] User at bottom');
    
    // Hide the scroll-to-bottom button
    setShowScrollToBottom(false);
    
    // Only re-enable listener if we're in pagination mode
    if (!isPaginationMode) return;
    
    console.log('   Fetching latest messages and switching to append-only mode');
    
    if (!conversationId || !user) return;
    
    try {
      // Step 1: Fetch the current latest 100 messages to catch up
      console.log('📥 [handleScrollToBottom] Fetching latest 100 messages to catch up...');
      const latestQuery = query(
        collection(db, 'conversations', conversationId as string, 'messages'),
        orderBy('createdAt', 'desc'),
        limit(MESSAGE_LIMIT)
      );
      
      const latestSnapshot = await getDocs(latestQuery);
      const latestMessages = latestSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      
      // For inverted list: keep DESC order (NO reverse)
      console.log(`📬 [handleScrollToBottom] Fetched ${latestMessages.length} latest messages (DESC order)`);
      
      // Step 2: Merge with existing paginated messages (prepend newer to inverted list)
      const existingIds = new Set(messages.map(m => m.id));
      const newMessages = latestMessages.filter(msg => !existingIds.has(msg.id));
      
      if (newMessages.length > 0) {
        console.log(`➕ [handleScrollToBottom] Prepending ${newMessages.length} new messages to existing ${messages.length}`);
        // PREPEND for inverted list (newer messages go at beginning of array)
        setMessages(prev => [...newMessages, ...prev]);
      } else {
        console.log('✅ [handleScrollToBottom] No new messages, already caught up');
      }
      
      // Step 3: Set up append-only listener for future messages
      console.log('🔊 [handleScrollToBottom] Setting up append-only listener for new messages');
      
      // Get the most recent message after merge (first element in inverted list)
      const currentMessages = newMessages.length > 0 
        ? [...newMessages, ...messages]
        : messages;
      
      if (currentMessages.length === 0) {
        console.warn('⚠️ [handleScrollToBottom] No messages to set up listener');
        return;
      }
      
      // Most recent message is at index 0 in inverted list
      const mostRecentMsg = currentMessages[0];
      
      // Fetch the document to use as cursor
      const mostRecentDocRef = doc(db, 'conversations', conversationId as string, 'messages', mostRecentMsg.id);
      const mostRecentDocSnap = await getDoc(mostRecentDocRef);
      
      if (!mostRecentDocSnap.exists()) {
        console.error('❌ [handleScrollToBottom] Could not fetch most recent message document');
        return;
      }
      
      // Query for messages AFTER the most recent one
      const appendOnlyQuery = query(
        collection(db, 'conversations', conversationId as string, 'messages'),
        orderBy('createdAt', 'asc'),
        startAfter(mostRecentDocSnap)
      );
      
      const unsubscribe = onSnapshot(appendOnlyQuery, (snapshot) => {
        if (snapshot.docs.length === 0) return;
        
        console.log('📬 [handleScrollToBottom] Append-only listener received', snapshot.docs.length, 'new messages');
        
        const newMsgs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];
        
        // PREPEND to inverted list (new messages go at beginning)
        setMessages(prev => [...newMsgs, ...prev]);
      });
      
      unsubscribeRef.current = unsubscribe;
      setIsPaginationMode(false);
      setShowScrollToBottom(false);
      
      console.log('✅ [handleScrollToBottom] Successfully switched to append-only mode');
      
    } catch (error) {
      console.error('❌ [handleScrollToBottom] Error:', error);
    }
  };

  // Manual scroll to bottom button
  const scrollToBottom = () => {
    console.log('🔘 [scrollToBottom] Button clicked, jumping to bottom');
    
    // First, scroll the list to bottom
    messageListRef.current?.scrollToEnd({ animated: true });
    
    // Then trigger the listener re-enable after a short delay
    setTimeout(() => {
      handleScrollToBottom();
    }, 500); // Give scroll animation time to complete
  };

  // Load more messages (pagination)
  const loadMoreMessages = async () => {
    if (!conversationId || typeof conversationId !== 'string' || !user) return;
    if (isLoadingMore || !hasMoreMessages || !oldestMessageRef.current) return;

    // Prevent concurrent pagination calls (race condition guard)
    if (paginationLockRef.current) {
      console.log('⚠️ [loadMoreMessages] Pagination already in progress, skipping...');
      return;
    }

    // CRITICAL: Stop real-time listener to prevent it from resetting state
    if (unsubscribeRef.current) {
      console.log('🔇 [loadMoreMessages] Unsubscribing from real-time listener (pagination mode)');
      unsubscribeRef.current();
      unsubscribeRef.current = null;
      setIsPaginationMode(true); // Enable pagination mode (shows jump to bottom button)
    }

    paginationLockRef.current = true;
    console.log('📜 [ChatScreen] Loading more messages...');
    console.log('   Current message count:', messages.length);
    setIsLoadingMore(true);

    try {
      // Query for messages BEFORE the oldest message we have
      // CRITICAL: With DESC order, use startAfter() not endBefore()
      // DESC order means newest-first, so startAfter() goes to older messages
      const q = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('createdAt', 'desc'),
        startAfter(oldestMessageRef.current), // <-- FIXED: was endBefore, should be startAfter for DESC
        limit(MESSAGE_LIMIT)
      );

      const snapshot = await getDocs(q);
      console.log('📬 [ChatScreen] Loaded', snapshot.docs.length, 'older messages');

      if (snapshot.docs.length === 0) {
        setHasMoreMessages(false);
        setIsLoadingMore(false);
        paginationLockRef.current = false;
        return;
      }

      const olderMsgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      // For inverted FlatList: keep DESC order (NO reverse)
      // Update oldest message ref
      oldestMessageRef.current = snapshot.docs[snapshot.docs.length - 1];

      // APPEND older messages to existing messages for inverted list
      // Current array: [newest...oldest]
      // Paginated array: [slightlyOlder...evenOlder]
      // Result: [newest...oldest, slightlyOlder...evenOlder]
      setMessages(prev => {
        const combined = [...prev, ...olderMsgs];
        const deduped = deduplicateMessages(combined);
        console.log('   After combining: total', deduped.length, 'messages');
        return deduped;
      });

      // Check if there are more messages to load
      setHasMoreMessages(snapshot.docs.length === MESSAGE_LIMIT);
    } catch (error) {
      console.error('❌ [ChatScreen] Error loading more messages:', error);
    } finally {
      setIsLoadingMore(false);
      paginationLockRef.current = false;
    }
  };

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
    // PREPEND for inverted list (new messages at index 0)
    setMessages(prev => [tempMessage, ...prev]);

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
          embedded: false, // For AI embedding pipeline
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
        lastMessage: text.substring(0, 100), // Simple string preview (consistent with firestoreService)
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: user.uid, // Track who sent the last message (for notifications)
        [`lastReadAt.${user.uid}`]: serverTimestamp(), // Mark as read by sender immediately
      });

      console.log('✅ [ChatScreen] Conversation lastMessage updated');

      // Remove temp message (real one will appear via listener)
      console.log('🗑️ [ChatScreen] Removing temp message:', tempId);
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempId);
        console.log('📊 [ChatScreen] Messages after removal:', filtered.length, 'remaining');
        return filtered;
      });

    } catch (error) {
      console.error('❌ [ChatScreen] Send message error:', error);
      
      // Log error with context
      ErrorLogger.log(error as Error, {
        userId: user.uid,
        conversationId: conversationId as string,
        action: 'send_message',
      });
      
      // Clear timeout
      const existingTimeout = timeoutRefs.current.get(tempId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        timeoutRefs.current.delete(tempId);
      }

      // Mark as failed
      updateMessageStatus(tempId, 'failed');
      
      // Save to AsyncStorage for persistence
      FailedMessagesService.saveFailedMessage(tempMessage, conversationId as string);
    }
  };

  const updateMessageStatus = (messageId: string, status: 'sending' | 'sent' | 'failed' | 'queued') => {
    console.log('🔄 [ChatScreen] Updating message status:', messageId, '→', status);
    setMessages(prev => 
      prev.map(m => m.id === messageId ? { ...m, status } : m)
    );
  };

  // Retry a failed message
  const handleRetryMessage = async (messageId: string) => {
    console.log('🔄 [ChatScreen] Retrying failed message:', messageId);
    
    // Find the failed message
    const failedMessage = messages.find(m => m.id === messageId);
    if (!failedMessage) {
      console.warn('⚠️ [ChatScreen] Failed message not found');
      return;
    }
    
    // Remove from AsyncStorage
    await FailedMessagesService.removeFailedMessage(messageId);
    
    // Remove from UI
    setMessages(prev => prev.filter(m => m.id !== messageId));
    
    // Resend
    await sendMessage(failedMessage.text);
  };

  // Delete a failed message
  const handleDeleteMessage = (messageId: string) => {
    console.log('🗑️ [ChatScreen] Deleting failed message:', messageId);
    
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this failed message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Remove from AsyncStorage
            await FailedMessagesService.removeFailedMessage(messageId);
            
            // Remove from UI
            setMessages(prev => prev.filter(m => m.id !== messageId));
          },
        },
      ]
    );
  };

  // Handle message long-press for spam reporting (Phase C)
  const handleMessageLongPress = async (message: Message) => {
    console.log('👆 [ChatScreen] Message long-press:', message.id);
    
    // Only show spam reporting for direct messages from other users
    if (conversation?.type !== 'direct' || message.senderId === user?.uid) {
      return;
    }
    
    const options = ['Report Spam', 'Cancel'];
    const destructiveButtonIndex = 0;
    const cancelButtonIndex = 1;
    
    const showActionSheet = () => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            destructiveButtonIndex,
            cancelButtonIndex,
            title: 'Message Options',
          },
          async (buttonIndex) => {
            if (buttonIndex === 0) {
              // Report Spam
              await handleReportSpam(message);
            }
          }
        );
      } else {
        // Android fallback using Alert
        Alert.alert(
          'Message Options',
          'What would you like to do?',
          [
            {
              text: 'Report Spam',
              onPress: () => handleReportSpam(message),
              style: 'destructive',
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
      }
    };
    
    showActionSheet();
  };
  
  const handleReportSpam = async (message: Message) => {
    try {
      console.log('🚨 [ChatScreen] Reporting spam:', message.id);
      
      if (!user?.uid || !conversationId || typeof conversationId !== 'string') {
        throw new Error('Invalid conversation or user');
      }
      
      await reportDirectMessageSpam(conversationId, message.senderId);
      
      Alert.alert(
        'Spam Reported',
        'This message has been reported. The sender has been blocked, and this conversation has been hidden from your list.',
        [{ text: 'OK' }]
      );
      
      // Navigate back to conversation list
      navigation.goBack();
      
    } catch (error: any) {
      console.error('❌ [ChatScreen] Error reporting spam:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to report spam. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Jump to message from search results
  const handleJumpToMessage = (messageId: string) => {
    console.log('🎯 [ChatScreen] Jumping to message:', messageId);
    
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      messageListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5, // Center the message in viewport
      });
      
      // Highlight the message for 2 seconds
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    } else {
      console.warn('⚠️ [ChatScreen] Message not found in current messages list');
    }
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

  // Phase 3: Read details for group chats (shows WHO has read)
  interface ReadDetails {
    readBy: { uid: string; displayName: string }[];
    unreadBy: { uid: string; displayName: string }[];
  }

  const getReadDetails = (message: Message): ReadDetails | null => {
    // Only for group chats and own messages
    if (!conversation || conversation.type !== 'group' || message.senderId !== user?.uid) {
      return null;
    }

    const otherParticipants = conversation.participants.filter(id => id !== user.uid);
    const readBy: { uid: string; displayName: string }[] = [];
    const unreadBy: { uid: string; displayName: string }[] = [];

    otherParticipants.forEach(participantId => {
      const participantDetails = conversation.participantDetails[participantId];
      const displayName = participantDetails?.displayName || 'Unknown';

      const lastRead = conversation.lastRead?.[participantId];
      
      if (lastRead) {
        const lastReadMsg = messages.find(m => m.id === lastRead);
        if (lastReadMsg) {
          const messageTime = getMessageTime(message);
          const lastReadTime = getMessageTime(lastReadMsg);

          if (messageTime && lastReadTime && messageTime <= lastReadTime) {
            readBy.push({ uid: participantId, displayName });
          } else {
            unreadBy.push({ uid: participantId, displayName });
          }
        } else {
          unreadBy.push({ uid: participantId, displayName });
        }
      } else {
        unreadBy.push({ uid: participantId, displayName });
      }
    });

    return { readBy, unreadBy };
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
    <ErrorBoundary level="screen">
      <View style={styles.container}>
      <OfflineBanner />
      <MessageList
        ref={messageListRef}
        messages={messages}
        currentUserId={user?.uid || ''}
        conversationType={conversation.type}
        getReadStatus={getReadStatus}
        getReadDetails={getReadDetails}
        highlightedMessageId={highlightedMessageId}
        onLoadMore={loadMoreMessages}
        onRetryMessage={handleRetryMessage}
        onDeleteMessage={handleDeleteMessage}
        onMessageLongPress={handleMessageLongPress}
        isLoadingMore={isLoadingMore}
        hasMoreMessages={hasMoreMessages}
        onScrollToBottom={handleScrollToBottom}
        onScrollAwayFromBottom={handleScrollAwayFromBottom}
      />
      <TypingIndicator typingUsers={typingUsers} />
      {!isBlockedByRecipient ? (
        <MessageInput
          onSend={sendMessage}
          onTyping={handleTyping}
          onStopTyping={handleStopTyping}
          disabled={false} // Can send even when offline (will queue)
        />
      ) : (
        <View style={styles.blockedMessageContainer}>
          <Text style={styles.blockedMessageText}>
            You cannot send messages to this user
          </Text>
        </View>
      )}
      
      {/* Jump to Bottom Button (shows when user has scrolled away from bottom) */}
      {showScrollToBottom && (
        <TouchableOpacity
          style={styles.scrollToBottomButton}
          onPress={scrollToBottom}
        >
          <Ionicons name="arrow-down" size={24} color="#FFF" />
        </TouchableOpacity>
      )}
      
      {/* Participants Modal (for both direct and group chats) */}
      <GroupParticipantsModal
        visible={showParticipantsModal}
        participants={Object.entries(conversation.participantDetails).map(([uid, details]) => ({
          uid,
          displayName: details.displayName,
          email: details.email,
        }))}
        currentUserId={user?.uid || ''}
        conversationId={conversationId as string}
        conversationType={conversation.type}
        isWorkspaceChat={!!conversation.workspaceId}
        onClose={() => setShowParticipantsModal(false)}
        onMemberAdded={async () => {
          // Refresh conversation to update participant list
          const conversationRef = doc(db, 'conversations', conversationId as string);
          const updatedConversation = await getDoc(conversationRef);
          if (updatedConversation.exists()) {
            setConversation(updatedConversation.data() as Conversation);
          }
        }}
      />

      {/* AI Features Menu */}
      <AIFeaturesMenu
        visible={showAIMenu}
        onClose={() => setShowAIMenu(false)}
        onOpenSearch={() => setShowSearchModal(true)}
        onOpenSummary={() => setShowSummaryModal(true)}
        onOpenActionItems={() => setShowActionItemsModal(true)}
        onOpenDecisions={() => setShowDecisionsModal(true)}
        onOpenMeetingScheduler={() => setShowMeetingSchedulerModal(true)}
        isGroupChat={conversation.type === 'group'}
        canAccessAI={canAccessAI}
        onUpgradeRequired={() => setShowUpgradeModal(true)}
      />

      {/* AI Feature Modals */}
      <SearchModal
        visible={showSearchModal}
        conversationId={conversationId as string}
        onClose={() => setShowSearchModal(false)}
        onSelectMessage={handleJumpToMessage}
      />

      <SummaryModal
        visible={showSummaryModal}
        conversationId={conversationId as string}
        onClose={() => setShowSummaryModal(false)}
      />

      <ActionItemsModal
        visible={showActionItemsModal}
        conversationId={conversationId as string}
        onClose={() => setShowActionItemsModal(false)}
      />

      <DecisionsModal
        visible={showDecisionsModal}
        conversationId={conversationId as string}
        onClose={() => setShowDecisionsModal(false)}
      />

      <MeetingSchedulerModal
        visible={showMeetingSchedulerModal}
        conversationId={conversationId as string}
        onClose={() => setShowMeetingSchedulerModal(false)}
      />

      {/* Upgrade to Pro Modal */}
      <UpgradeToProModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgradeSuccess={async () => {
          setShowUpgradeModal(false);
          // Refresh user data from Firestore to get new Pro status
          if (user?.uid) {
            try {
              await refreshUserProfile();
              Alert.alert('Success!', 'Welcome to Pro! 🎉\n\nYou now have AI features everywhere.');
            } catch (error) {
              console.error('Failed to refresh user data after upgrade:', error);
              Alert.alert('Success!', 'Upgrade successful! Please restart the app to see changes.');
            }
          }
        }}
        onTrialStart={async () => {
          setShowUpgradeModal(false);
          // Refresh user data from Firestore to get trial status
          if (user?.uid) {
            try {
              await refreshUserProfile();
              Alert.alert('Trial Started!', 'Enjoy 5 days of full Pro access! 🎉');
            } catch (error) {
              console.error('Failed to refresh user data after trial start:', error);
              Alert.alert('Trial Started!', 'Please restart the app to see changes.');
            }
          }
        }}
      />
    </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollToBottomButton: {
    position: 'absolute',
    right: 20,
    bottom: 100, // Above the message input
    backgroundColor: '#007AFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
  blockedMessageContainer: {
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    alignItems: 'center',
  },
  blockedMessageText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
});
