/**
 * Authentication Store (Zustand)
 * Global state management for authentication and user session
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { UserProfile } from '../services/authService';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  setUser: (user: UserProfile | null) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

const STORAGE_KEY = '@messageai:user';

/**
 * Auth Store
 * Manages user authentication state with AsyncStorage persistence
 */
export const useAuthStore = create<AuthState>((set) => ({
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
   */
  restoreSession: async () => {
    try {
      console.log('[authStore] Starting restoreSession...');
      const userJson = await AsyncStorage.getItem(STORAGE_KEY);
      console.log('[authStore] AsyncStorage data:', userJson ? 'Found user data' : 'No user data');
      
      if (userJson) {
        const user = JSON.parse(userJson) as UserProfile;
        console.log('[authStore] Parsed user object:', {
          uid: user?.uid,
          email: user?.email,
          displayName: user?.displayName,
        });
        
        // Validate that the user object has required fields
        if (user && user.uid && user.email) {
          console.log('[authStore] ✅ Valid user, restoring session');
          set({ user, loading: false });
        } else {
          console.warn('[authStore] ⚠️ Invalid user data in AsyncStorage, clearing');
          await AsyncStorage.removeItem(STORAGE_KEY);
          set({ user: null, loading: false });
        }
      } else {
        console.log('[authStore] No cached user, setting to null');
        set({ user: null, loading: false });
      }
    } catch (error) {
      console.error('[authStore] Failed to restore session:', error);
      // Clear corrupted data
      await AsyncStorage.removeItem(STORAGE_KEY);
      set({ user: null, loading: false });
    }
  },
}));

