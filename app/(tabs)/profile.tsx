/**
 * Phase 4: User Profile Screen
 * 
 * Displays user account information, subscription status, and Pro features.
 * Accessible via ProfileButton in top-right corner of all tab screens.
 * Hidden from tab bar (href: null in layout config).
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { HelpModal, UpgradeToProModal } from '../../components';
import { logoutUser } from '../../services/authService';
import { getUserWorkspaceInvitations } from '../../services/workspaceService';
import { useAuthStore } from '../../store/authStore';
import type { WorkspaceInvitation } from '../../types';
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
  const { user, logout, refreshUserProfile } = useAuthStore();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  
  // Load pending invitations
  const loadInvitations = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const invites = await getUserWorkspaceInvitations(user.uid);
      setInvitations(invites);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    }
  }, [user?.uid]);
  
  // Refresh user data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const refreshUser = async () => {
        if (user?.uid) {
          setIsRefreshing(true);
          try {
            await refreshUserProfile();
            await loadInvitations();
          } catch (error) {
            console.error('Failed to refresh user data:', error);
          } finally {
            setIsRefreshing(false);
          }
        }
      };
      
      refreshUser();
    }, [user?.uid, refreshUserProfile, loadInvitations])
  );
  
  // Manual refresh handler
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUserProfile();
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Start free trial handler
  const handleStartTrial = async () => {
    if (isStartingTrial) return; // Prevent double-click
    
    setIsStartingTrial(true);
    try {
      console.log('🎉 [ProfileScreen] Starting 5-day free trial...');
      
      // Call the startFreeTrial Cloud Function
      const functions = getFunctions();
      const startTrialFn = httpsCallable(functions, 'startFreeTrial');
      await startTrialFn();
      
      console.log('✅ [ProfileScreen] Trial started successfully');
      
      // Refresh user data to get updated trial status
      await refreshUserProfile();
      
      Alert.alert(
        '🎉 Trial Started!',
        'You now have 5 days of free access to all Pro features. Enjoy!',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('❌ [ProfileScreen] Failed to start trial:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to start trial. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsStartingTrial(false);
    }
  };
  
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
        await refreshUserProfile();
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
        await refreshUserProfile();
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
      {/* Top Button Row */}
      <View style={styles.topButtonRow}>
        {/* Help Button (Left) */}
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => setShowHelpModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="help-circle-outline" size={24} color="#007AFF" />
        </TouchableOpacity>

        {/* Logout Button (Right) */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
          <Ionicons name="log-out-outline" size={18} color="#B91C1C" />
        </TouchableOpacity>
      </View>

      {/* Notifications Section - Only show if invitations exist */}
      {invitations.length > 0 && (
        <View style={styles.notificationsSection}>
          <Text style={styles.notificationsSectionTitle}>Notifications</Text>
          
          {invitations.map((invitation) => (
            <TouchableOpacity
              key={invitation.id}
              style={styles.notificationCard}
              onPress={() => router.push('/workspace/invitations' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.notificationIcon}>
                <Ionicons name="business" size={20} color={Colors.primary} />
              </View>
              
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>
                  Workspace Invitation
                </Text>
                <Text style={styles.notificationText}>
                  {invitation.invitedByDisplayName} invited you to join{' '}
                  <Text style={styles.notificationWorkspace}>{invitation.workspaceName}</Text>
                </Text>
              </View>
              
              <Ionicons name="chevron-forward" size={20} color={Colors.textMedium} />
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => router.push('/workspace/invitations' as any)}
          >
            <Text style={styles.viewAllButtonText}>
              View All Invitations ({invitations.length})
            </Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      )}

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
            style={[styles.trialButton, isStartingTrial && styles.trialButtonDisabled]}
            onPress={handleStartTrial}
            activeOpacity={0.7}
            disabled={isStartingTrial}
          >
            <Ionicons 
              name={isStartingTrial ? "hourglass-outline" : "gift-outline"} 
              size={20} 
              color={isStartingTrial ? '#999' : Colors.primary} 
            />
            <Text style={[styles.trialButtonText, isStartingTrial && styles.trialButtonTextDisabled]}>
              {isStartingTrial ? 'Starting Trial...' : 'Start 5-Day Free Trial'}
            </Text>
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

      {/* Help Modal */}
      <HelpModal
        visible={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
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
  topButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  helpButton: {
    padding: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#B91C1C',
    borderRadius: 8,
    backgroundColor: '#FFF',
    gap: 6,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B91C1C',
  },
  notificationsSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  notificationsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 12,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 4,
  },
  notificationText: {
    fontSize: 13,
    color: Colors.textMedium,
    lineHeight: 18,
  },
  notificationWorkspace: {
    fontWeight: '600',
    color: Colors.primary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
    gap: 6,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
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
  trialButtonDisabled: {
    opacity: 0.5,
    borderColor: '#999',
  },
  trialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 8,
  },
  trialButtonTextDisabled: {
    color: '#999',
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

