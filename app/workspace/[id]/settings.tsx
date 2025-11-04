/**
 * Phase 4: Workspace Settings Screen
 * Manage workspace: members, capacity, billing, delete
 */

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { callCloudFunction } from '../../../services/cloudFunctions';
import { exportWorkspaceData } from '../../../services/workspaceExportService';
import { getWorkspace } from '../../../services/workspaceService';
import { useAuthStore } from '../../../store/authStore';
import type { Workspace } from '../../../types';
import { Alerts } from '../../../utils/alerts';
import { Colors } from '../../../utils/colors';

export default function WorkspaceSettingsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state: any) => state.user);
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadWorkspace = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const ws = await getWorkspace(id);
      setWorkspace(ws);
    } catch (error) {
      console.error('Error loading workspace:', error);
      Alerts.error('Failed to load workspace');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWorkspace = () => {
    if (!workspace) return;

    // Scary confirmation modal
    Alerts.confirm(
      '⚠️ Delete Workspace?',
      `This will PERMANENTLY delete "${workspace.name}" and ALL workspace chats.\n\nThis action CANNOT be undone.\n\nAll ${workspace.members.length} members will lose access immediately.`,
      confirmDelete,
      { confirmText: 'Delete Forever', isDestructive: true }
    );
  };

  const confirmDelete = async () => {
    if (!workspace) return;

    setIsDeleting(true);
    try {
      await callCloudFunction('deleteWorkspace', { workspaceId: workspace.id });

      Alerts.success('Workspace deleted successfully', () => router.replace('/workspaces' as any));
    } catch (error: any) {
      console.error('Delete workspace error:', error);
      Alerts.error(error.message || 'Failed to delete workspace');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportWorkspace = async () => {
    if (!workspace || !id) return;

    setIsExporting(true);
    try {
      const result = await exportWorkspaceData(id, workspace.name);
      
      if (result.success && result.data) {
        const { metadata } = result.data;
        let message = `Exported ${metadata.totalConversations} conversations with ${metadata.totalMessages} messages.`;
        
        if (metadata.timeoutWarning) {
          message += `\n\n⚠️ ${metadata.timeoutWarning}`;
        }
        
        Alerts.success(message);
      } else if (result.error && result.error !== 'Export cancelled') {
        // Don't show error if user cancelled
        Alerts.error(result.error);
      }
    } catch (error: any) {
      console.error('Export workspace error:', error);
      Alerts.error(error.message || 'Failed to export workspace');
    } finally {
      setIsExporting(false);
    }
  };

  const handleLeaveWorkspace = () => {
    Alerts.confirm(
      'Leave Workspace?',
      `Are you sure you want to leave "${workspace?.name}"?\n\nYou'll lose access to all workspace chats.`,
      async () => {
        // TODO: Implement leaveWorkspace Cloud Function
        Alerts.error('Leave workspace feature coming soon');
      },
      { confirmText: 'Leave', isDestructive: true }
    );
  };

  const handleInviteMember = () => {
    router.push(`/workspace/${id}/invite-member` as any);
  };

  const handleManageMembers = () => {
    router.push(`/workspace/${id}/members` as any);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!workspace) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Workspace not found</Text>
      </View>
    );
  }

  const isAdmin = workspace.adminUid === user?.uid;
  const memberCount = workspace.members.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workspace Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Workspace Info */}
      <View style={styles.infoCard}>
        <View style={styles.iconCircle}>
          <Ionicons name="business" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.workspaceName}>{workspace.name}</Text>
        {isAdmin && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>You&apos;re the Admin</Text>
          </View>
        )}
      </View>

      {/* Payment Status */}
      {!workspace.isActive && (
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={20} color="#DC2626" />
          <Text style={styles.warningText}>
            Payment lapsed - workspace is read-only
          </Text>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{memberCount}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{workspace.groupChatCount}</Text>
          <Text style={styles.statLabel}>Group Chats</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{workspace.totalMessages}</Text>
          <Text style={styles.statLabel}>Messages</Text>
        </View>
      </View>

      {/* Members Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Members</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleManageMembers}>
          <Ionicons name="people-outline" size={24} color={Colors.textDark} />
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuText}>Manage Members</Text>
            <Text style={styles.menuSubtext}>
              {memberCount} of {workspace.maxUsersThisMonth} capacity
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMedium} />
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity style={styles.menuItem} onPress={handleInviteMember}>
            <Ionicons name="person-add-outline" size={24} color={Colors.primary} />
            <Text style={styles.menuText}>Invite Member</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMedium} />
          </TouchableOpacity>
        )}
      </View>

      {/* Billing Section (Admin Only) */}
      {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing</Text>
          
          <View style={styles.billingCard}>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Capacity:</Text>
              <Text style={styles.billingValue}>{workspace.maxUsersThisMonth} users</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Price per user:</Text>
              <Text style={styles.billingValue}>$0.50/month</Text>
            </View>
            <View style={[styles.billingRow, styles.billingTotal]}>
              <Text style={styles.billingTotalLabel}>Monthly charge:</Text>
              <Text style={styles.billingTotalValue}>
                ${workspace.currentMonthCharge.toFixed(2)}/month
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="card-outline" size={24} color={Colors.textDark} />
            <Text style={styles.menuText}>Change Capacity</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMedium} />
          </TouchableOpacity>
        </View>
      )}

      {/* Export Section (Admin Only) */}
      {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleExportWorkspace}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <ActivityIndicator color={Colors.primary} />
                <Text style={[styles.menuText, { marginLeft: 16 }]}>Exporting...</Text>
              </>
            ) : (
              <>
                <Ionicons name="download-outline" size={24} color={Colors.primary} />
                <Text style={styles.menuText}>Export Workspace (JSON)</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMedium} />
              </>
            )}
          </TouchableOpacity>
          
          <Text style={styles.helperText}>
            Download all workspace data including messages, members, and AI analysis
          </Text>
        </View>
      )}

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
        
        {isAdmin ? (
          <TouchableOpacity
            style={[styles.menuItem, styles.dangerItem]}
            onPress={handleDeleteWorkspace}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color="#DC2626" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={24} color="#DC2626" />
                <Text style={styles.dangerText}>Delete Workspace</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.menuItem, styles.dangerItem]}
            onPress={handleLeaveWorkspace}
          >
            <Ionicons name="exit-outline" size={24} color="#DC2626" />
            <Text style={styles.dangerText}>Leave Workspace</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textMedium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textDark,
  },
  headerSpacer: {
    width: 40,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  workspaceName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  adminBadge: {
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#DC2626',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMedium,
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
  dangerTitle: {
    color: '#DC2626',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textDark,
    flex: 1,
    marginLeft: 12,
  },
  helperText: {
    fontSize: 13,
    color: Colors.textMedium,
    marginTop: 8,
    marginLeft: 40, // Align with menu text
    lineHeight: 18,
  },
  menuSubtext: {
    fontSize: 13,
    color: Colors.textMedium,
    marginTop: 2,
  },
  billingCard: {
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billingLabel: {
    fontSize: 14,
    color: Colors.textMedium,
  },
  billingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textDark,
  },
  billingTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  billingTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
  },
  billingTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  dangerItem: {
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FFF',
  },
  dangerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#DC2626',
    flex: 1,
    marginLeft: 12,
  },
});

