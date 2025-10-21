/**
 * Root Layout
 * - Restores user session on app launch
 * - Sets up navigation structure
 * - Will add presence tracking in Phase 5
 */

import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  const restoreSession = useAuthStore((state) => state.restoreSession);

  // Restore session on app launch
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

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
