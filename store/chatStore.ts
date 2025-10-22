import { create } from 'zustand';
import { Conversation } from '../types';

interface ChatState {
  conversations: Conversation[];
  onlineStatuses: Record<string, { isOnline: boolean; lastSeenAt: any }>;
  
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateOnlineStatus: (uid: string, status: any) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  onlineStatuses: {},

  setConversations: (conversations) => {
    console.log('💾 [chatStore] Setting conversations:', conversations.length);
    set({ conversations });
  },

  addConversation: (conversation) => {
    console.log('➕ [chatStore] Adding conversation:', conversation.id);
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    }));
  },

  updateOnlineStatus: (uid, status) => {
    console.log('🟢 [chatStore] Updating online status for:', uid, status.isOnline);
    set((state) => ({
      onlineStatuses: {
        ...state.onlineStatuses,
        [uid]: status,
      },
    }));
  },
}));

