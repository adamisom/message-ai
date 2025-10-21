/**
 * Index Screen (Landing/Redirect)
 * Redirects based on authentication state:
 * - If authenticated: redirect to main app (tabs)
 * - If not authenticated: redirect to login
 */

import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);

  console.log('🏠 [Index] Rendering, loading:', loading, 'user:', user?.email);

  // Show loading spinner while checking session
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Redirect based on auth state
  if (user) {
    console.log('✅ [Index] User authenticated, redirecting to tabs');
    // @ts-ignore - Dynamic route not in type definition yet
    return <Redirect href="/(tabs)" />;
  }

  // Not authenticated, redirect to login
  console.log('🔒 [Index] No user, redirecting to login');
  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
});
