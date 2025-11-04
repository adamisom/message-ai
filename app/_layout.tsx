/**
 * Root Layout
 * - Restores user session on app launch
 * - Sets up navigation structure
 * - Phase 5: Presence tracking (online/offline status)
 * - Phase 6: Notification setup and handling
 */

import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { ErrorBoundary } from '../components/ErrorBoundary';
import {
    configureNotificationHandler,
    requestNotificationPermissions
} from '../services/notificationService';
import { setUserOffline, setUserOnline } from '../services/presenceService';
import { useAuthStore } from '../store/authStore';
import { FEATURE_FLAGS } from '../utils/featureFlags';

export default function RootLayout() {
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const refreshUserProfile = useAuthStore((state) => state.refreshUserProfile);
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const router = useRouter();

  // Restore session on app launch
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Auto-refresh user profile every 5 minutes
  // This catches field deletions that pure merging would miss
  useEffect(() => {
    if (!user) return;

    console.log('⏰ [RootLayout] Setting up 5-minute profile refresh timer');
    
    const interval = setInterval(() => {
      console.log('⏰ [RootLayout] Auto-refreshing profile (5min timer)');
      refreshUserProfile();
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      console.log('⏰ [RootLayout] Clearing profile refresh timer');
      clearInterval(interval);
    };
  }, [user, refreshUserProfile]);

  // Setup notifications (Phase 6)
  useEffect(() => {
    // Configure notification behavior
    configureNotificationHandler();

    // Request permissions on mount
    const setupNotifications = async () => {
      const granted = await requestNotificationPermissions();
      if (granted) {
        console.log('✅ Notification permissions granted');
      } else {
        console.log('❌ Notification permissions denied');
      }
    };

    setupNotifications();
  }, []);

  // Handle notification taps (Phase 6)
  useEffect(() => {
    // Listen for notification taps
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const conversationId = response.notification.request.content.data.conversationId;
      
      if (conversationId && typeof conversationId === 'string') {
        console.log('📱 Notification tapped, navigating to:', conversationId);
        
        // Navigate to the conversation
        router.push(`/chat/${conversationId}`);
      }
    });

    // Cleanup
    return () => {
      subscription.remove();
    };
  }, [router]);

  // Track user presence (online/offline)
  // CRITICAL: Only start presence tracking AFTER restoreSession completes (loading: false)
  // This prevents presence writes from interfering with the initial profile fetch
  useEffect(() => {
    // Feature flag check - can be disabled for debugging
    if (!FEATURE_FLAGS.PRESENCE_TRACKING_ENABLED) {
      console.log('👤 [RootLayout] Presence tracking disabled via feature flag');
      return;
    }

    if (!user || loading) return; // Wait for loading to be false

    console.log('👤 [RootLayout] Setting up presence tracking for user:', user.uid);

    // Set online when component mounts
    setUserOnline(user.uid);

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log('📱 [RootLayout] App state changed:', nextAppState);
      
      if (nextAppState === 'active') {
        setUserOnline(user.uid);
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        setUserOffline(user.uid);
      }
    });

    // Set offline on unmount (app close or logout)
    return () => {
      console.log('🔌 [RootLayout] Cleaning up presence tracking');
      subscription.remove();
      // Note: setUserOffline will check if user is still authenticated
      // If user logged out, this will be skipped gracefully
      setUserOffline(user.uid);
    };
  }, [user, loading]); // Added loading dependency

  return (
    <ErrorBoundary level="app">
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="chat/[id]" 
          options={{ 
            title: 'Chat',
            headerShown: true,
            headerBackTitle: 'Back'
          }} 
        />
      </Stack>
    </ErrorBoundary>
  );
}
