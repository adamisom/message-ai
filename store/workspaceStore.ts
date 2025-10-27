/**
 * Workspace Store - Global state management for workspaces
 * Phase 4: Workspaces & Paid Tier
 * Uses Zustand for lightweight, performant state management
 */

import type { Unsubscribe } from 'firebase/firestore';
import { create } from 'zustand';
import {
    getUserMemberWorkspaces,
    getUserOwnedWorkspaces,
    getUserWorkspaceInvitations,
    subscribeToUserWorkspaces,
} from '../services/workspaceService';
import { Workspace, WorkspaceInvitation } from '../types';

interface WorkspaceState {
  // State
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  invitations: WorkspaceInvitation[];
  loading: boolean;
  error: string | null;
  
  // Real-time listener
  workspacesUnsubscribe: Unsubscribe | null;
  
  // Actions
  loadWorkspaces: (userId: string) => Promise<void>;
  setCurrentWorkspace: (workspaceId: string | null) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
  removeWorkspace: (workspaceId: string) => void;
  loadInvitations: (userId: string) => Promise<void>;
  startWorkspacesListener: (userId: string) => void;
  stopWorkspacesListener: () => void;
  clearWorkspaces: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  // Initial state
  workspaces: [],
  currentWorkspace: null,
  invitations: [],
  loading: false,
  error: null,
  workspacesUnsubscribe: null,
  
  // Load all workspaces for user (owned + member of)
  loadWorkspaces: async (userId: string) => {
    set({ loading: true, error: null });
    
    try {
      const [owned, member] = await Promise.all([
        getUserOwnedWorkspaces(userId),
        getUserMemberWorkspaces(userId),
      ]);
      
      const allWorkspaces = [...owned, ...member];
      
      set({
        workspaces: allWorkspaces,
        loading: false,
      });
    } catch (error: any) {
      console.error('Error loading workspaces:', error);
      set({
        error: error.message,
        loading: false,
      });
    }
  },
  
  // Set current workspace (for filtering conversations)
  setCurrentWorkspace: (workspaceId: string | null) => {
    const { workspaces } = get();
    
    if (!workspaceId) {
      set({ currentWorkspace: null });
      return;
    }
    
    const workspace = workspaces.find(ws => ws.id === workspaceId);
    set({ currentWorkspace: workspace || null });
  },
  
  // Add new workspace to state
  addWorkspace: (workspace: Workspace) => {
    set(state => ({
      workspaces: [...state.workspaces, workspace],
    }));
  },
  
  // Update workspace in state
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => {
    set(state => ({
      workspaces: state.workspaces.map(ws =>
        ws.id === workspaceId ? { ...ws, ...updates } : ws
      ),
      currentWorkspace: state.currentWorkspace?.id === workspaceId
        ? { ...state.currentWorkspace, ...updates }
        : state.currentWorkspace,
    }));
  },
  
  // Remove workspace from state
  removeWorkspace: (workspaceId: string) => {
    set(state => ({
      workspaces: state.workspaces.filter(ws => ws.id !== workspaceId),
      currentWorkspace: state.currentWorkspace?.id === workspaceId
        ? null
        : state.currentWorkspace,
    }));
  },
  
  // Load pending invitations
  loadInvitations: async (userId: string) => {
    try {
      const invitations = await getUserWorkspaceInvitations(userId);
      set({ invitations });
    } catch (error: any) {
      console.error('Error loading invitations:', error);
      set({ error: error.message });
    }
  },
  
  // Start real-time listener for workspaces
  startWorkspacesListener: (userId: string) => {
    const { workspacesUnsubscribe } = get();
    
    // Don't create duplicate listeners
    if (workspacesUnsubscribe) {
      return;
    }
    
    const unsubscribe = subscribeToUserWorkspaces(
      userId,
      (workspaces) => {
        set({ workspaces });
      },
      (error) => {
        console.error('Workspace listener error:', error);
        set({ error: error.message });
      }
    );
    
    set({ workspacesUnsubscribe: unsubscribe });
  },
  
  // Stop real-time listener
  stopWorkspacesListener: () => {
    const { workspacesUnsubscribe } = get();
    
    if (workspacesUnsubscribe) {
      workspacesUnsubscribe();
      set({ workspacesUnsubscribe: null });
    }
  },
  
  // Clear all workspace state (on logout)
  clearWorkspaces: () => {
    const { workspacesUnsubscribe } = get();
    
    if (workspacesUnsubscribe) {
      workspacesUnsubscribe();
    }
    
    set({
      workspaces: [],
      currentWorkspace: null,
      invitations: [],
      loading: false,
      error: null,
      workspacesUnsubscribe: null,
    });
  },
}));

