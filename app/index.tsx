/**
 * Index Screen (Landing/Redirect)
 * Redirects based on authentication state:
 * - If authenticated: redirect to main app (will be /(tabs) in Phase 2)
 * - If not authenticated: redirect to login
 */

import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);

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
    // TODO: In Phase 2, change this to redirect to /(tabs)
    // For now, just show a placeholder with success message
    return (
      <View style={styles.container}>
        <Text style={styles.successText}>✅ Authentication Successful!</Text>
        <Text style={styles.infoText}>Logged in as: {user.displayName}</Text>
        <Text style={styles.infoText}>Email: {user.email}</Text>
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
        <Text style={styles.placeholderText}>
          Phase 1 Complete{'\n'}
          Conversations list will appear in Phase 2
        </Text>
      </View>
    );
  }

  // Not authenticated, redirect to login
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
  successText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
});
