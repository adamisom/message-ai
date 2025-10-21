/**
 * Root Layout
 * - Restores user session on app launch
 * - Sets up navigation structure
 * - Will add presence tracking in Phase 5
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
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
    </Stack>
  );
}
