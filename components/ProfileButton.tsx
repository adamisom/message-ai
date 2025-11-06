/**
 * ProfileButton Component
 * 
 * Circular button displaying user initials in the top-right corner of tab screens.
 * Navigates to the user profile screen when tapped.
 * Shows selected state when on profile screen.
 * Shows notification badge (upper left) for pending invitations.
 */

import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getUserInvitationCount } from '../services/invitationService';
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
  const [invitationCount, setInvitationCount] = useState(0);
  
  // Determine if we're on the profile screen
  const isOnProfileScreen = pathname === '/profile';
  
  const initials = getInitials(user?.displayName || '');
  
  // Load invitation count (all types: workspace, group chat, DM)
  useEffect(() => {
    loadInvitationCount();
    
    // Refresh count every 30 seconds while component is mounted
    const interval = setInterval(loadInvitationCount, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, pathname]); // Refresh when pathname changes (e.g., returning from invitations screen)
  
  const loadInvitationCount = async () => {
    if (!user?.uid) return;
    try {
      const count = await getUserInvitationCount(user.uid);
      setInvitationCount(count);
    } catch (error) {
      console.error('[ProfileButton] Error loading invitation count:', error);
    }
  };
  
  const handlePress = () => {
    router.push('/profile' as any);
  };
  
  return (
    <View style={styles.container}>
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
      
      {/* Notification Badge - Upper Left Position */}
      {invitationCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {invitationCount > 9 ? '9+' : invitationCount}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 44, // Extra space for badge
    height: 36,
    marginRight: 4,
    position: 'relative',
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
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
  badge: {
    position: 'absolute',
    top: -4,
    left: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626', // Red notification badge
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFF',
    zIndex: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
});

