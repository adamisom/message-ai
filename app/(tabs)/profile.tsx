/**
 * Phase 4: User Profile Screen
 * 
 * Displays user account information, subscription status, and Pro features.
 * Accessible via ProfileButton in top-right corner of all tab screens.
 * Hidden from tab bar (href: null in layout config).
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { HelpModal, SpamWarningBanner, UpgradeToProModal, UserSettingsModal } from '../../components';
import { logoutUser, updateUserProfile } from '../../services/authService';
import { getAllUserInvitations } from '../../services/invitationService';
import { getUserSpamStatus, SpamStatus } from '../../services/spamService';
import { startFreeTrial, showTrialStartedAlert, showTrialErrorAlert } from '../../services/subscriptionService';
import { exportUserConversationsData } from '../../services/userExportService';
import { useAuthStore } from '../../store/authStore';
import { Alerts } from '../../utils/alerts';
import { Colors } from '../../utils/colors';
import { getUserPermissions } from '../../utils/userPermissions';
import { formatPhoneNumberDisplay } from '../../utils/phoneFormat';
import { UnifiedInvitation } from '../../types';

// UnifiedInvitation type is now in types/index.ts

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

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, refreshUserProfile } = useAuthStore();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [invitations, setInvitations] = useState<UnifiedInvitation[]>([]);
  const [spamStatus, setSpamStatus] = useState<SpamStatus | null>(null);
  const [showSpamWarning, setShowSpamWarning] = useState(true);
  const [showSlowLoadingMessage, setShowSlowLoadingMessage] = useState(false);
  
  // Load pending invitations (workspace + group chat + DM)
  const loadInvitations = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const invites = await getAllUserInvitations(user.uid);
      setInvitations(invites);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    }
  }, [user?.uid]);
  
  // Load spam status
  const loadSpamStatus = useCallback(async () => {
    try {
      const status = await getUserSpamStatus();
      setSpamStatus(status);
    } catch (error) {
      console.error('Failed to load spam status:', error);
    }
  }, []);
  
  // Show slow loading message after 1.5 seconds
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    
    if (!user || isRefreshing) {
      setShowSlowLoadingMessage(false);
      timer = setTimeout(() => {
        setShowSlowLoadingMessage(true);
      }, 1500);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [user, isRefreshing]);
  
  // Refresh user data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const refreshUser = async () => {
        if (user?.uid) {
          setIsRefreshing(true);
          try {
            await refreshUserProfile();
            await loadInvitations();
            await loadSpamStatus();
          } catch (error) {
            console.error('Failed to refresh user data:', error);
          } finally {
            setIsRefreshing(false);
          }
        }
      };
      
      refreshUser();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid])
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
      await startFreeTrial();
      console.log('✅ [ProfileScreen] Trial started successfully');
      
      // Refresh user data to get updated trial status
      await refreshUserProfile();
      showTrialStartedAlert();
    } catch (error: any) {
      console.error('❌ [ProfileScreen] Failed to start trial:', error);
      showTrialErrorAlert(error);
    } finally {
      setIsStartingTrial(false);
    }
  };
  
  if (!user || isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
        {showSlowLoadingMessage && (
          <Text style={styles.slowLoadingText}>
            Still loading, just a few seconds...
          </Text>
        )}
      </View>
    );
  }
  
  const initials = getInitials(user.displayName || '');
  
  // Get comprehensive user permissions using helper
  const permissions = getUserPermissions(user);
  
  // Extract for backward compatibility with existing JSX
  const {
    statusBadge,
    statusColor,
    statusDetail,
    showTrialButton,
    showUpgradeButton,
    showManageButton,
  } = permissions;
  
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
    Alerts.confirm(
      'Logout',
      'Are you sure you want to logout?',
      async () => {
        console.log('👋 [ProfileScreen] Logging out');
        await logoutUser();
        logout();
        router.replace('/(auth)/login');
      },
      { confirmText: 'Logout', isDestructive: true }
    );
  };
  
  // Save DM privacy setting
  const handleSaveDmSetting = async (newSetting: 'private' | 'public') => {
    if (!user?.uid) return;
    
    try {
      await updateUserProfile(user.uid, { dmPrivacySetting: newSetting });
      await refreshUserProfile();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update settings');
    }
  };
  
  // Export user conversations
  const handleExportConversations = async () => {
    setIsExporting(true);
    try {
      const result = await exportUserConversationsData();
      
      if (result.success && result.data) {
        const { metadata } = result.data;
        let message = `Exported ${metadata.totalConversations} conversations with ${metadata.totalMessages} messages.`;
        
        if (metadata.timeoutWarning) {
          message += `\n\n⚠️ ${metadata.timeoutWarning}`;
        }
        
        Alerts.success(message);
      } else {
        Alerts.error(result.error || 'Export failed');
      }
    } catch (error: any) {
      console.error('Export conversations error:', error);
      Alerts.error(error);
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Button Row */}
      <View style={styles.topButtonRow}>
        {/* Help & Settings Buttons (Left) */}
        <View style={styles.leftButtons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowHelpModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="help-circle-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.iconButton, { marginLeft: 12 }]}
            onPress={() => setShowSettingsModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

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

      {/* Sub-Phase 8: Spam Warning Banner */}
      {spamStatus && showSpamWarning && spamStatus.status !== 'good' && (
        <SpamWarningBanner
          status={spamStatus.status}
          message={spamStatus.message}
          strikeCount={spamStatus.strikeCount}
          banEndsAt={spamStatus.banEndsAt}
          onDismiss={() => setShowSpamWarning(false)}
        />
      )}

      {/* Notifications Section - Only show if invitations exist */}
      {invitations.length > 0 && (
        <View style={styles.notificationsSection}>
          <Text style={styles.notificationsSectionTitle}>Notifications</Text>
          
          {invitations.map((invitation) => {
            const isWorkspace = invitation.type === 'workspace';
            const isGroupChat = invitation.type === 'group_chat';
            const isDM = invitation.type === 'direct_message';
            
            let iconName: any = 'business';
            let invitationType = 'Workspace';
            
            if (isGroupChat) {
              iconName = 'people';
              invitationType = 'Group Chat';
            } else if (isDM) {
              iconName = 'chatbubble';
              invitationType = 'Direct Message';
            }
            
            return (
              <TouchableOpacity
                key={invitation.id}
                style={styles.notificationCard}
                onPress={() => router.push('/workspace/invitations' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.notificationIcon}>
                  <Ionicons name={iconName} size={20} color={Colors.primary} />
                </View>
                
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>
                    {invitationType} Invitation
                  </Text>
                  <Text style={styles.notificationText}>
                    {invitation.invitedByDisplayName} invited you{isWorkspace ? ' to join ' : ' to '}
                    {isWorkspace && (
                      <Text style={styles.notificationWorkspace}>{invitation.workspaceName}</Text>
                    )}
                    {isGroupChat && (
                      <Text style={styles.notificationWorkspace}>{invitation.name}</Text>
                    )}
                    {isDM && 'chat'}
                  </Text>
                </View>
                
                <Ionicons name="chevron-forward" size={20} color={Colors.textMedium} />
              </TouchableOpacity>
            );
          })}
          
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
        
        {/* Phone Number */}
        <Text style={styles.phoneNumber}>
          {user.phoneNumber ? formatPhoneNumberDisplay(user.phoneNumber) : 'No phone number'}
        </Text>
        
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
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          <Text style={styles.featureText}>Edit & Delete Messages</Text>
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
        onExportConversations={handleExportConversations}
        isExporting={isExporting}
      />
      
      {/* Sub-Phase 11: User Settings Modal */}
      <UserSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentSetting={user?.dmPrivacySetting || 'private'}
        onSave={handleSaveDmSetting}
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
  leftButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
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
  slowLoadingText: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 8,
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
  phoneNumber: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.primary,
    marginBottom: 2,
    letterSpacing: 0.3,
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

