/**
 * Authentication Store (Zustand)
 * Global state management for authentication and user session
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, getUserProfile } from '../services/authService';

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
   * Fetches fresh user data from Firestore to ensure status is up-to-date
   */
  restoreSession: async () => {
    try {
      const userJson = await AsyncStorage.getItem(STORAGE_KEY);
      if (userJson) {
        const cachedUser = JSON.parse(userJson) as UserProfile;
        
        // Set cached user immediately for faster load
        set({ user: cachedUser, loading: true });
        
        try {
          // Fetch fresh user data from Firestore to get latest trial/subscription status
          const freshUser = await getUserProfile(cachedUser.uid);
          if (freshUser) {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(freshUser));
            set({ user: freshUser, loading: false });
          } else {
            // User no longer exists, clear session
            await AsyncStorage.removeItem(STORAGE_KEY);
            set({ user: null, loading: false });
          }
        } catch (error) {
          console.error('Failed to fetch fresh user data, using cached:', error);
          // Keep cached user if fetch fails
          set({ user: cachedUser, loading: false });
        }
      } else {
        set({ user: null, loading: false });
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
      set({ user: null, loading: false });
    }
  },
}));

