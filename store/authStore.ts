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
      console.log('[authStore] AsyncStorage data:', userJson ? 'Found user data' : 'No user data');
      
      if (userJson) {
        const cachedUser = JSON.parse(userJson) as UserProfile;
        console.log('[authStore] Parsed cached user object:', {
          uid: cachedUser?.uid,
          email: cachedUser?.email,
          displayName: cachedUser?.displayName,
          isPaidUser: cachedUser?.isPaidUser,
          hasTrialEndsAt: !!cachedUser?.trialEndsAt,
        });
        console.log('[authStore] Raw user JSON (first 200 chars):', userJson.substring(0, 200));
        
        // Validate that the user object has required fields
        if (cachedUser && cachedUser.uid && cachedUser.email) {
          console.log('[authStore] ✅ Valid cached user, setting immediately');
          // Set cached user with loading: false so components can render
          set({ user: cachedUser, loading: false });
          
          // Fetch fresh user data in background to get latest trial/subscription status
          console.log('[authStore] 🔄 Fetching fresh user data from Firestore...');
          try {
            const freshUser = await getUserProfile(cachedUser.uid);
            if (freshUser) {
              console.log('[authStore] ✅ Got fresh user data from Firestore');
              console.log('[authStore] Fresh user fields:', {
                isPaidUser: freshUser.isPaidUser,
                subscriptionTier: freshUser.subscriptionTier,
                trialUsed: freshUser.trialUsed,
                hasTrialEndsAt: !!freshUser.trialEndsAt,
              });
              
              // Validate fresh user has required fields
              if (!freshUser.uid || !freshUser.email) {
                console.error('[authStore] ❌ Fresh user data is invalid, keeping cached user');
                return; // Keep cached user, don't update
              }
              
              // Always update AsyncStorage with fresh data for next session
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(freshUser));
              
              // Only update state if subscription/trial status changed
              // This prevents unnecessary re-renders and component unmounting
              const statusChanged = 
                freshUser.isPaidUser !== cachedUser.isPaidUser ||
                freshUser.subscriptionTier !== cachedUser.subscriptionTier ||
                JSON.stringify(freshUser.trialEndsAt) !== JSON.stringify(cachedUser.trialEndsAt) ||
                freshUser.trialUsed !== cachedUser.trialUsed;
              
              if (statusChanged) {
                console.log('[authStore] 🔄 Subscription/trial status changed:');
                console.log('  isPaidUser:', cachedUser.isPaidUser, '→', freshUser.isPaidUser);
                console.log('  subscriptionTier:', cachedUser.subscriptionTier, '→', freshUser.subscriptionTier);
                console.log('  trialUsed:', cachedUser.trialUsed, '→', freshUser.trialUsed);
                console.log('  trialEndsAt changed:', JSON.stringify(cachedUser.trialEndsAt) !== JSON.stringify(freshUser.trialEndsAt));
                
                // Use get() to ensure we're not accidentally nullifying state during update
                const currentState = get();
                if (currentState.user) {
                  set({ user: freshUser });
                } else {
                  console.warn('[authStore] ⚠️ Current user is null during update, skipping');
                }
              } else{
                console.log('[authStore] ✅ Status unchanged, AsyncStorage updated (state unchanged)');
              }
            } else {
              // User no longer exists in Firestore, clear session
              console.warn('[authStore] ⚠️ User not found in Firestore, clearing session');
              await AsyncStorage.removeItem(STORAGE_KEY);
              set({ user: null });
            }
          } catch (fetchError) {
            console.error('[authStore] ❌ Failed to fetch fresh user data:', fetchError);
            // Keep cached user if fetch fails - app still works with potentially stale data
            console.log('[authStore] 📦 Continuing with cached user data');
          }
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

