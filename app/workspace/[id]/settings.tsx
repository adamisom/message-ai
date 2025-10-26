/**
 * Phase 4: Workspace Settings Screen
 * Manage workspace: members, capacity, billing, delete
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../firebase.config';
import { authStore } from '../../../store/authStore';
import { workspaceStore } from '../../../store/workspaceStore';
import { getWorkspace, deleteWorkspace as deleteWorkspaceService } from '../../../services/workspaceService';
import { Colors } from '../../../utils/colors';
import type { Workspace } from '../../../types';

export default function WorkspaceSettingsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = authStore((state) => state.user);
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadWorkspace();
  }, [id]);

  const loadWorkspace = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const ws = await getWorkspace(id);
      setWorkspace(ws);
    } catch (error) {
      console.error('Error loading workspace:', error);
      Alert.alert('Error', 'Failed to load workspace');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWorkspace = () => {
    if (!workspace) return;

    // Scary confirmation modal
    Alert.alert(
      '⚠️ Delete Workspace?',
      `This will PERMANENTLY delete "${workspace.name}" and ALL workspace chats.\n\nThis action CANNOT be undone.\n\nAll ${workspace.members.length} members will lose access immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!workspace) return;

    setIsDeleting(true);
    try {
      const deleteWorkspaceFn = httpsCallable(functions, 'deleteWorkspace');
      await deleteWorkspaceFn({ workspaceId: workspace.id });

      Alert.alert('Deleted', 'Workspace deleted successfully', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/workspaces') },
      ]);
    } catch (error: any) {
      console.error('Delete workspace error:', error);
      Alert.alert('Error', error.message || 'Failed to delete workspace');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLeaveWorkspace = () => {
    Alert.alert(
      'Leave Workspace?',
      `Are you sure you want to leave "${workspace?.name}"?\n\nYou'll lose access to all workspace chats.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            // TODO: Implement leaveWorkspace Cloud Function
            Alert.alert('Coming Soon', 'Leave workspace feature coming soon');
          },
        },
      ]
    );
  };

  const handleInviteMember = () => {
    router.push(`/workspace/${id}/invite-member`);
  };

  const handleManageMembers = () => {
    router.push(`/workspace/${id}/members`);
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
            <Text style={styles.adminBadgeText}>You're the Admin</Text>
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

