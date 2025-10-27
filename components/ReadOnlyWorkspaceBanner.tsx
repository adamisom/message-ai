import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../utils/colors';

interface ReadOnlyWorkspaceBannerProps {
  visible: boolean;
  reason: 'payment_failed' | 'inactive';
  onContactAdmin?: () => void;
}

export default function ReadOnlyWorkspaceBanner({
  visible,
  reason,
  onContactAdmin,
}: ReadOnlyWorkspaceBannerProps) {
  if (!visible) return null;

  const message = reason === 'payment_failed'
    ? 'Payment failed. Workspace is read-only.'
    : 'Workspace is inactive and read-only.';

  return (
    <View style={styles.banner}>
      <View style={styles.iconContainer}>
        <Ionicons name="lock-closed" size={20} color="#fff" />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.message}>{message}</Text>
        <Text style={styles.submessage}>
          Contact admin to restore access
        </Text>
      </View>

      {onContactAdmin && (
        <TouchableOpacity
          style={styles.button}
          onPress={onContactAdmin}
        >
          <Text style={styles.buttonText}>Contact</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  submessage: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  button: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF3B30',
  },
});

