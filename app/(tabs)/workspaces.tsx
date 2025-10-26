/**
 * Phase 4: Workspaces Screen
 * Lists all workspaces (owned + member of)
 * Workspace switcher and management hub
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { TrialWorkspaceModal } from '../../components/TrialWorkspaceModal';
import { UpgradeToProModal } from '../../components/UpgradeToProModal';
import { getUserProfile } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import type { Workspace } from '../../types';
import { Colors } from '../../utils/colors';

// Helper to check if user is in active trial
function isInTrial(user: any): boolean {
  if (!user?.trialEndsAt) return false;
  const now = Date.now();
  const trialEndsAt = typeof user.trialEndsAt === 'number'
    ? user.trialEndsAt
    : user.trialEndsAt.toMillis?.() || 0;
  return now < trialEndsAt;
}

export default function WorkspacesScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const {
    workspaces,
    loading: isLoading,
    loadWorkspaces,
    setCurrentWorkspace,
    currentWorkspace,
  } = useWorkspaceStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadWorkspaces(user.uid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleRefresh = async () => {
    if (!user?.uid) return;
    setRefreshing(true);
    await loadWorkspaces(user.uid);
    setRefreshing(false);
  };

  const handleWorkspacePress = (workspace: Workspace) => {
    setCurrentWorkspace(workspace.id);
    // Navigate to workspace view or chats
    router.push('/');
  };

  const handleCreateWorkspace = () => {
    // Check if user is Pro
    if (user?.isPaidUser) {
      // Pro user - allow workspace creation
      router.push('/create-workspace' as any);
      return;
    }

    // Check if user is in trial
    if (isInTrial(user)) {
      // Trial user - show restriction modal
      setShowTrialModal(true);
      return;
    }

    // Free user - show upgrade modal
    setShowUpgradeModal(true);
  };

  const ownedWorkspaces = workspaces.filter((ws: Workspace) => ws.adminUid === user?.uid);
  const memberWorkspaces = workspaces.filter((ws: Workspace) => ws.adminUid !== user?.uid);

  if (isLoading && workspaces.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading workspaces...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Workspaces</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateWorkspace}
        >
          <Ionicons name="add-circle" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Current Workspace Indicator */}
      {currentWorkspace && workspaces.find((ws: Workspace) => ws.id === currentWorkspace?.id) && (
        <View style={styles.currentWorkspaceBox}>
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          <Text style={styles.currentWorkspaceText}>
            Current: {workspaces.find((ws: Workspace) => ws.id === currentWorkspace?.id)?.name}
          </Text>
        </View>
      )}

      {/* Empty State */}
      {workspaces.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="business-outline" size={64} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>No Workspaces Yet</Text>
          <Text style={styles.emptyDescription}>
            Create a workspace to collaborate with your team
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={handleCreateWorkspace}
          >
            <Text style={styles.emptyButtonText}>Create Workspace</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Owned Workspaces */}
      {ownedWorkspaces.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Workspaces</Text>
          {ownedWorkspaces.map((workspace: Workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              isOwner={true}
              isCurrent={workspace.id === currentWorkspace?.id}
              onPress={() => handleWorkspacePress(workspace)}
              onSettings={() => router.push(`/workspace/${workspace.id}/settings` as any)}
            />
          ))}
        </View>
      )}

      {/* Member Workspaces */}
      {memberWorkspaces.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Member Of</Text>
          {memberWorkspaces.map((workspace: Workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              isOwner={false}
              isCurrent={workspace.id === currentWorkspace?.id}
              onPress={() => handleWorkspacePress(workspace)}
              onSettings={() => router.push(`/workspace/${workspace.id}/settings` as any)}
            />
          ))}
        </View>
      )}

      {/* Info Box - Only show for free users (not Pro, not in trial) */}
      {!user?.isPaidUser && !isInTrial(user) && (
        <TouchableOpacity
          style={styles.infoBox}
          onPress={() => setShowUpgradeModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoText}>
              Workspaces give your team shared chats with full AI features
            </Text>
            <Text style={styles.infoSubtext}>
              Upgrade to Pro to create workspaces
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={Colors.primary} style={styles.infoArrow} />
        </TouchableOpacity>
      )}

      {/* Upgrade to Pro Modal */}
      <UpgradeToProModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgradeSuccess={async () => {
          setShowUpgradeModal(false);
          // Refresh user data from Firestore to get new Pro status
          if (user?.uid) {
            try {
              const updatedUser = await getUserProfile(user.uid);
              if (updatedUser) {
                await setUser(updatedUser);
                // Reload workspaces to reflect new Pro status
                await loadWorkspaces(user.uid);
              }
            } catch (error) {
              console.error('Failed to refresh user data after upgrade:', error);
            }
          }
        }}
        onTrialStart={async () => {
          setShowUpgradeModal(false);
          // Refresh user data from Firestore to get trial status
          if (user?.uid) {
            try {
              const updatedUser = await getUserProfile(user.uid);
              if (updatedUser) {
                await setUser(updatedUser);
                // Reload workspaces to reflect new trial status
                await loadWorkspaces(user.uid);
              }
            } catch (error) {
              console.error('Failed to refresh user data after trial start:', error);
            }
          }
        }}
      />

      {/* Trial Workspace Restriction Modal */}
      <TrialWorkspaceModal
        visible={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        onUpgradeSuccess={async () => {
          setShowTrialModal(false);
          // Refresh user data from Firestore to get new Pro status
          if (user?.uid) {
            try {
              const updatedUser = await getUserProfile(user.uid);
              if (updatedUser) {
                await setUser(updatedUser);
                // Reload workspaces to reflect new Pro status
                await loadWorkspaces(user.uid);
              }
            } catch (error) {
              console.error('Failed to refresh user data after upgrade:', error);
            }
          }
        }}
      />
    </ScrollView>
  );
}

interface WorkspaceCardProps {
  workspace: Workspace;
  isOwner: boolean;
  isCurrent: boolean;
  onPress: () => void;
  onSettings: () => void;
}

function WorkspaceCard({
  workspace,
  isOwner,
  isCurrent,
  onPress,
  onSettings,
}: WorkspaceCardProps) {
  const memberCount = workspace.members.length;
  const isActive = workspace.isActive;

  return (
    <TouchableOpacity
      style={[styles.card, isCurrent && styles.cardCurrent]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Ionicons
            name="business"
            size={20}
            color={isCurrent ? Colors.primary : Colors.textDark}
          />
          <Text style={[styles.cardTitle, isCurrent && styles.cardTitleCurrent]}>
            {workspace.name}
          </Text>
          {isOwner && (
            <View style={styles.ownerBadge}>
              <Text style={styles.ownerBadgeText}>Admin</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onSettings} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Ionicons name="settings-outline" size={20} color={Colors.textMedium} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.cardInfoItem}>
          <Ionicons name="people-outline" size={16} color={Colors.textMedium} />
          <Text style={styles.cardInfoText}>
            {memberCount}/{workspace.maxUsersThisMonth} members
          </Text>
        </View>
        
        {!isActive && (
          <View style={[styles.cardInfoItem, styles.inactiveIndicator]}>
            <Ionicons name="warning" size={16} color="#DC2626" />
            <Text style={styles.inactiveText}>Payment Lapsed</Text>
          </View>
        )}
      </View>

      {isOwner && (
        <Text style={styles.cardFooter}>
          ${workspace.currentMonthCharge.toFixed(2)}/month
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textMedium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  createButton: {
    padding: 8,
  },
  currentWorkspaceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  currentWorkspaceText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#2E7D32',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.textMedium,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardCurrent: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F9FF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginLeft: 8,
    flex: 1,
  },
  cardTitleCurrent: {
    color: Colors.primary,
  },
  ownerBadge: {
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  ownerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  cardInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfoText: {
    fontSize: 13,
    color: Colors.textMedium,
    marginLeft: 4,
  },
  inactiveIndicator: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  inactiveText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    marginLeft: 4,
  },
  cardFooter: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.primary,
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 12,
    color: Colors.primary,
    opacity: 0.8,
  },
  infoArrow: {
    marginLeft: 8,
  },
});

