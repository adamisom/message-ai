/**
 * Phase 4: User Profile Screen
 * 
 * Displays user account information, subscription status, and Pro features.
 * Accessible via ProfileButton in top-right corner of all tab screens.
 * Hidden from tab bar (href: null in layout config).
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { UpgradeToProModal } from '../../components';
import { getUserProfile, logoutUser } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../utils/colors';

/**
 * Get initials from display name (matches ProfileButton logic)
 */
function getInitials(displayName: string): string {
  if (!displayName) return '?';
  
  const words = displayName.trim().split(' ');
  
  if (words.length > 1) {
    return (words[0][0] + words[1][0]).toUpperCase();
  } else {
    return words[0][0].toUpperCase();
  }
}

/**
 * Format date for subscription expiry
 */
function formatDate(timestamp: any): string {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, setUser, logout } = useAuthStore();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Refresh user data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const refreshUser = async () => {
        if (user?.uid) {
          setIsRefreshing(true);
          try {
            const freshUser = await getUserProfile(user.uid);
            if (freshUser) {
              await setUser(freshUser);
            }
          } catch (error) {
            console.error('Failed to refresh user data:', error);
          } finally {
            setIsRefreshing(false);
          }
        }
      };
      
      refreshUser();
    }, [user?.uid, setUser])
  );
  
  if (!user || isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }
  
  const initials = getInitials(user.displayName || '');
  
  // Determine status badge and details
  let statusBadge = '';
  let statusColor = '#8E8E93'; // Gray
  let statusDetail = '';
  let showTrialButton = false;
  let showUpgradeButton = false;
  let showManageButton = false;
  
  const now = Date.now();
  
  if (user.isPaidUser) {
    // Pro User
    statusBadge = '💎 Pro User';
    statusColor = Colors.primary;
    statusDetail = user.subscriptionEndsAt 
      ? `Expires: ${formatDate(user.subscriptionEndsAt)}`
      : '';
    showManageButton = true;
  } else if (user.trialEndsAt) {
    // User has trial data - check if active
    const trialEndsAt = user.trialEndsAt.toMillis ? user.trialEndsAt.toMillis() : user.trialEndsAt;
    
    if (now < trialEndsAt) {
      // Active Trial User - show upgrade button
      const daysRemaining = Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24));
      statusBadge = '🎉 Trial User';
      statusColor = '#FFD700'; // Gold
      statusDetail = `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`;
      showUpgradeButton = true;
    } else {
      // Free User (trial expired)
      statusBadge = '🔓 Free User';
      statusColor = '#8E8E93';
      statusDetail = 'Trial ended';
      
      // Check if they're eligible for trial again (test script scenario)
      if (!user.trialUsed) {
        showTrialButton = true;
      }
      showUpgradeButton = true;
    }
  } else {
    // Free User (never had trial) - show trial + upgrade
    statusBadge = '🔓 Free User';
    statusColor = '#8E8E93';
    statusDetail = '';
    
    if (!user.trialUsed) {
      showTrialButton = true;
    }
    showUpgradeButton = true;
  }
  
  const handleUpgradeSuccess = async () => {
    setShowUpgradeModal(false);
    // Refresh user data
    if (user?.uid) {
      try {
        const updatedUser = await getUserProfile(user.uid);
        if (updatedUser) {
          await setUser(updatedUser);
        }
      } catch (error) {
        console.error('Failed to refresh user data after upgrade:', error);
      }
    }
  };
  
  const handleTrialStart = async () => {
    setShowUpgradeModal(false);
    // Refresh user data
    if (user?.uid) {
      try {
        const updatedUser = await getUserProfile(user.uid);
        if (updatedUser) {
          await setUser(updatedUser);
        }
      } catch (error) {
        console.error('Failed to refresh user data after trial start:', error);
      }
    }
  };
  
  const handleManageSubscription = () => {
    router.push('/subscription' as any);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            console.log('👋 [ProfileScreen] Logging out');
            await logoutUser();
            logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };
  
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Logout Button at Top */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={20} color="#DC2626" />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      {/* Profile Header */}
      <View style={styles.headerSection}>
        {/* Large Avatar with Initials */}
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
        
        {/* Display Name */}
        <Text style={styles.displayName}>{user.displayName}</Text>
        
        {/* Email */}
        <Text style={styles.email}>{user.email}</Text>
        
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
            {statusBadge}
          </Text>
        </View>
        
        {/* Status Detail */}
        {statusDetail && (
          <Text style={styles.statusDetail}>{statusDetail}</Text>
        )}
      </View>
      
      {/* Features Section */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Pro Features</Text>
        
        {/* AI Features */}
        <Text style={styles.subheader}>AI Features:</Text>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          <Text style={styles.featureText}>Track Action Items & Decisions</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          <Text style={styles.featureText}>AI Summaries & Semantic Search</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          <Text style={styles.featureText}>
            Meeting Scheduler & Auto-Detection of Urgent Messages
          </Text>
        </View>
        
        {/* Workspace Features */}
        <Text style={[styles.subheader, styles.workspaceSubheader]}>Workspace Features:</Text>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          <Text style={styles.featureText}>Create up to 5 private workspaces</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          <Text style={styles.featureText}>
            Assign action items within the chat
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          <Text style={styles.featureText}>
            Edit and save AI-generated text & high-priority markers on messages
          </Text>
        </View>
        
        <Text style={styles.pricingNote}>50¢ per member per workspace</Text>
      </View>
      
      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        {showTrialButton && (
          <TouchableOpacity
            style={styles.trialButton}
            onPress={() => setShowUpgradeModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="gift-outline" size={20} color={Colors.primary} />
            <Text style={styles.trialButtonText}>Start 5-Day Free Trial</Text>
          </TouchableOpacity>
        )}
        
        {showUpgradeButton && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => setShowUpgradeModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to Pro Now</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
        
        {showManageButton && (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={handleManageSubscription}
            activeOpacity={0.7}
          >
            <Text style={styles.manageButtonText}>Manage Subscription</Text>
            <Ionicons name="settings-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Upgrade Modal */}
      <UpgradeToProModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgradeSuccess={handleUpgradeSuccess}
        onTrialStart={handleTrialStart}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textMedium,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  displayName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: Colors.textMedium,
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusBadgeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusDetail: {
    fontSize: 14,
    color: Colors.textMedium,
  },
  featuresSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 16,
  },
  subheader: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 12,
  },
  workspaceSubheader: {
    marginTop: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 4,
  },
  featureText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: Colors.textDark,
    lineHeight: 20,
  },
  pricingNote: {
    fontSize: 12,
    color: Colors.textMedium,
    fontStyle: 'italic',
    marginTop: 16,
    textAlign: 'center',
  },
  actionsSection: {
    gap: 12,
  },
  trialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  trialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 8,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginRight: 8,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginRight: 8,
  },
});

