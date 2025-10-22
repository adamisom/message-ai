/**
 * Root Layout
 * - Restores user session on app launch
 * - Sets up navigation structure
 * - Phase 5: Presence tracking (online/offline status)
 * - Phase 6: Notification setup and handling
 */

import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { setUserOffline, setUserOnline } from '../services/presenceService';
import { 
  requestNotificationPermissions, 
  configureNotificationHandler 
} from '../services/notificationService';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  // Restore session on app launch
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

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
  useEffect(() => {
    if (!user) return;

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
  }, [user]);

  return (
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
  );
}
