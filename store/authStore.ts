/**
 * Authentication Store (Zustand)
 * Global state management for authentication and user session
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { UserProfile, getUserProfile } from '../services/authService';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  setUser: (user: UserProfile | null) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  refreshUserProfile: () => Promise<void>; // Manual/periodic refresh
}

const STORAGE_KEY = '@messageai:user';

/**
 * Auth Store
 * Manages user authentication state with AsyncStorage persistence
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true, // Start as true to check for existing session

  /**
   * Set user and persist to AsyncStorage
   */
  setUser: async (user: UserProfile | null) => {
    try {
      if (user) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
      set({ user, loading: false });
    } catch (error) {
      console.error('Failed to persist user:', error);
      set({ user, loading: false });
    }
  },

  /**
   * Logout - clear user from state and storage
   */
  logout: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      set({ user: null, loading: false });
    } catch (error) {
      console.error('Failed to clear user from storage:', error);
      set({ user: null, loading: false });
    }
  },

  /**
   * Restore session from AsyncStorage on app launch
   * Fetches fresh user data from Firestore after restoring cached data
   * to ensure trial/subscription status is always up-to-date
   */
  restoreSession: async () => {
    try {
      console.log('[authStore] Starting restoreSession...');
      const userJson = await AsyncStorage.getItem(STORAGE_KEY);
      
      if (userJson) {
        const cachedUser = JSON.parse(userJson) as UserProfile;
        
        // Validate that the user object has required fields
        if (cachedUser && cachedUser.uid && cachedUser.email) {
          console.log('[authStore] Valid cached user found');
          // Set cached user but KEEP loading: true to prevent presence tracking
          // Presence tracking waits for loading: false to avoid interfering with fetch
          set({ user: cachedUser, loading: true });
          
          // Fetch fresh user data in background to get latest trial/subscription status
          try {
            const freshUser = await getUserProfile(cachedUser.uid);
            if (freshUser) {
              // FIRESTORE SDK BUG WORKAROUND: SDK only returns fields written by client
              // Instead of validating and rejecting incomplete data, MERGE it with cached data
              // This preserves fields like uid/email/displayName while updating subscription status
              const mergedUser = { ...cachedUser, ...freshUser };
              
              // Always update both AsyncStorage and state with merged data
              // Set loading: false NOW to allow presence tracking to start
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mergedUser));
              set({ user: mergedUser, loading: false });
              console.log('[authStore] Profile refreshed and updated');
            } else {
              // User no longer exists in Firestore, clear session
              console.warn('[authStore] User not found in Firestore, clearing session');
              await AsyncStorage.removeItem(STORAGE_KEY);
              set({ user: null });
            }
          } catch (fetchError) {
            console.error('[authStore] Failed to fetch fresh user data:', fetchError);
            // Keep cached user if fetch fails - app still works with potentially stale data
            // Set loading: false so app can continue
            set({ loading: false });
            console.log('[authStore] Continuing with cached user data');
          }
        } else {
          console.warn('[authStore] Invalid user data in AsyncStorage, clearing');
          await AsyncStorage.removeItem(STORAGE_KEY);
          set({ user: null, loading: false });
        }
      } else {
        console.log('[authStore] No cached user found');
        set({ user: null, loading: false });
      }
    } catch (error) {
      console.error('[authStore] Failed to restore session:', error);
      // Clear corrupted data
      await AsyncStorage.removeItem(STORAGE_KEY);
      set({ user: null, loading: false });
    }
  },

  /**
   * Refresh user profile from Firestore
   * Used for manual refresh button and periodic auto-refresh
   * This does a FULL fetch (not merge) to catch field deletions
   */
  refreshUserProfile: async () => {
    const currentUser = get().user;
    if (!currentUser) {
      return;
    }

    console.log('[authStore] Refreshing user profile...');
    try {
      const freshUser = await getUserProfile(currentUser.uid);
      if (freshUser) {
        // FULL REPLACE (not merge) to catch deleted fields
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(freshUser));
        set({ user: freshUser });
        console.log('[authStore] Profile refreshed successfully');
      } else {
        console.warn('[authStore] User not found during refresh');
      }
    } catch (error) {
      console.error('[authStore] Failed to refresh profile:', error);
      // Keep existing user on error
    }
  },
}));

