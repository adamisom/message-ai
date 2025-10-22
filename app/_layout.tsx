/**
 * Root Layout
 * - Restores user session on app launch
 * - Sets up navigation structure
 * - Phase 5: Presence tracking (online/offline status)
 */

import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { setUserOffline, setUserOnline } from '../services/presenceService';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const user = useAuthStore((state) => state.user);

  // Restore session on app launch
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

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
