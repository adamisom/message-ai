/**
 * TEMPORARY PLACEHOLDER FOR PHASE 2 TESTING
 * This file will be REPLACED in Phase 3 with the real chat implementation
 */

import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function ChatScreenPlaceholder() {
  const { id } = useLocalSearchParams();
  
  console.log('💬 [ChatPlaceholder] Opened chat:', id);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat Screen (Phase 3)</Text>
      <Text style={styles.subtitle}>Conversation ID: {id}</Text>
      <Text style={styles.info}>
        This is a temporary placeholder.{'\n'}
        The real chat screen will be implemented in Phase 3.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  info: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

