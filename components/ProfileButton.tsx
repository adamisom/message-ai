/**
 * ProfileButton Component
 * 
 * Circular button displaying user initials in the top-right corner of tab screens.
 * Navigates to the user profile screen when tapped.
 * Shows selected state when on profile screen.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../utils/colors';

/**
 * Extract initials from display name
 * - Multiple words: first letter of first two words
 * - Single word: first letter only
 * - Empty: "?"
 */
function getInitials(displayName: string): string {
  if (!displayName) return '?';
  
  const words = displayName.trim().split(' ');
  
  if (words.length > 1) {
    // Multiple words: take first letter of first two words
    return (words[0][0] + words[1][0]).toUpperCase();
  } else {
    // Single word: take first letter only
    return words[0][0].toUpperCase();
  }
}

export const ProfileButton: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  
  // Determine if we're on the profile screen
  const isOnProfileScreen = pathname === '/profile';
  
  const initials = getInitials(user?.displayName || '');
  
  const handlePress = () => {
    router.push('/profile' as any);
  };
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isOnProfileScreen && styles.buttonSelected
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.initials}>{initials}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonSelected: {
    backgroundColor: '#005BBF', // Darker blue when selected
    borderColor: Colors.primary,
  },
  initials: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});

