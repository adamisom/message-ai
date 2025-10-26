import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { generateConversationId } from '../utils/conversationHelpers';

// Type definitions
interface User {
  uid: string;
  email: string;
  displayName: string;
  isOnline?: boolean;
  lastSeenAt?: any;
  createdAt?: any;
}

interface ParticipantDetail {
  displayName: string;
  email: string;
}

/**
 * Find a user by their email address
 * Used for user discovery in new chat creation
 * @param email - Email to search for (will be normalized)
 * @returns User object or null if not found
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  const normalizedEmail = email.toLowerCase().trim();
  
  console.log('🔍 [firestoreService] Finding user by email:', normalizedEmail);
  
  const q = query(
    collection(db, 'users'),
    where('email', '==', normalizedEmail),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    console.log('❌ [firestoreService] User not found');
    return null;
  }
  
  const userDoc = snapshot.docs[0];
  const user = { 
    uid: userDoc.id, 
    ...userDoc.data() 
  } as User;
  
  console.log('✅ [firestoreService] User found:', user.displayName, user.email);
  return user;
};

/**
 * Create or open a one-on-one conversation
 * Uses sorted UIDs as conversation ID for consistency
 * @param otherUser - The other user's data
 * @param currentUser - Current user's data
 * @param workspaceId - Optional workspace ID for workspace-scoped chats
 * @param workspaceName - Optional workspace name for workspace-scoped chats
 * @returns conversationId
 */
export const createOrOpenConversation = async (
  otherUser: User, 
  currentUser: User,
  workspaceId?: string,
  workspaceName?: string
): Promise<string> => {
  // Sort UIDs to ensure consistent conversation ID
  const conversationId = generateConversationId(currentUser.uid, otherUser.uid);
  const conversationRef = doc(db, 'conversations', conversationId);
  
  console.log('💬 [firestoreService] Creating/opening conversation:', conversationId, workspaceId ? `(workspace: ${workspaceName})` : '(no workspace)');
  
  const conversationDoc = await getDoc(conversationRef);

  if (!conversationDoc.exists()) {
    console.log('📝 [firestoreService] Creating new conversation');
    // Create new conversation
    await setDoc(conversationRef, {
      type: 'direct',
      participants: [currentUser.uid, otherUser.uid],
      participantDetails: {
        [currentUser.uid]: { 
          displayName: currentUser.displayName, 
          email: currentUser.email 
        },
        [otherUser.uid]: { 
          displayName: otherUser.displayName, 
          email: otherUser.email 
        },
      },
      createdAt: serverTimestamp(),
      lastMessageAt: null,
      lastMessage: null,
      lastRead: {},
      messageCount: 0, // For AI cache invalidation
      // Phase 5: Workspace context
      ...(workspaceId && {
        workspaceId,
        workspaceName,
        isWorkspaceChat: true,
      }),
    });
    console.log('✅ [firestoreService] New conversation created');
  } else {
    console.log('✅ [firestoreService] Opening existing conversation');
  }

  return conversationId;
};

/**
 * Create a group conversation
 * @param participants - Array of user objects (excluding current user)
 * @param currentUser - Current user's data
 * @param workspaceId - Optional workspace ID for workspace-scoped chats
 * @param workspaceName - Optional workspace name for workspace-scoped chats
 * @returns conversationId
 */
export const createGroupConversation = async (
  participants: User[], 
  currentUser: User,
  workspaceId?: string,
  workspaceName?: string
): Promise<string> => {
  if (participants.length < 2) {
    throw new Error('Group chat requires at least 2 other participants');
  }

  const participantIds = [currentUser.uid, ...participants.map(p => p.uid)];
  const participantDetails: Record<string, ParticipantDetail> = {
    [currentUser.uid]: { 
      displayName: currentUser.displayName, 
      email: currentUser.email 
    },
  };

  participants.forEach(p => {
    participantDetails[p.uid] = { 
      displayName: p.displayName, 
      email: p.email 
    };
  });

  console.log('👥 [firestoreService] Creating group conversation with', participantIds.length, 'members', workspaceId ? `(workspace: ${workspaceName})` : '(no workspace)');

  const conversationRef = await addDoc(collection(db, 'conversations'), {
    type: 'group',
    name: `Group with ${participantIds.length} members`,
    participants: participantIds,
    participantDetails,
    creatorId: currentUser.uid,
    createdAt: serverTimestamp(),
    lastMessageAt: null,
    lastMessage: null,
    lastRead: {},
    messageCount: 0, // For AI cache invalidation
    // Phase 5: Workspace context
    ...(workspaceId && {
      workspaceId,
      workspaceName,
      isWorkspaceChat: true,
    }),
  });

  console.log('✅ [firestoreService] Group conversation created:', conversationRef.id);
  return conversationRef.id;
};

/**
 * Send a message in a conversation
 * NOTE: This will be used in Phase 3
 * @param conversationId - ID of the conversation
 * @param text - Message text
 * @param senderId - UID of sender
 * @param senderName - Display name of sender
 * @param participants - Array of participant UIDs (denormalized)
 * @returns messageId
 */
export const sendMessage = async (
  conversationId: string,
  text: string,
  senderId: string,
  senderName: string,
  participants: string[]
): Promise<string> => {
  console.log('📨 [firestoreService] Sending message in conversation:', conversationId);
  
  const messageRef = await addDoc(
    collection(db, 'conversations', conversationId, 'messages'),
    {
      text,
      senderId,
      senderName,
      participants, // Denormalized for security rules
      createdAt: serverTimestamp(),
      embedded: false, // For AI embedding pipeline
    }
  );

  // Update conversation's lastMessage
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: text.substring(0, 100),
    lastMessageAt: serverTimestamp(),
  });

  console.log('✅ [firestoreService] Message sent:', messageRef.id);
  return messageRef.id;
};

