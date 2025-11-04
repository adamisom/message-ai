/**
 * Phase 4: Workspace Members Screen
 * View and manage workspace members
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
import { getWorkspace } from '../../../services/workspaceService';
import { useAuthStore } from '../../../store/authStore';
import type { Workspace } from '../../../types';
import { Alerts } from '../../../utils/alerts';
import { Colors } from '../../../utils/colors';

export default function WorkspaceMembersScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state: any) => state.user);
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleRemoveMember = (memberUid: string, memberName: string) => {
    if (memberUid === workspace?.adminUid) {
      Alerts.error('Cannot remove workspace admin');
      return;
    }

    Alerts.confirm(
      'Remove Member?',
      `Remove ${memberName} from workspace?`,
      () => {
        // TODO: Call removeMember Cloud Function
        Alerts.error('Remove member feature coming soon');
      },
      { confirmText: 'Remove', isDestructive: true }
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!workspace) {
    return null;
  }

  const isAdmin = workspace.adminUid === user?.uid;
  const members = Object.entries(workspace.memberDetails || {}).map(([uid, details]) => ({
    uid,
    ...details,
  }));

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Members</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Capacity Info */}
      <View style={styles.capacityBox}>
        <Text style={styles.capacityText}>
          {members.length} of {workspace.maxUsersThisMonth} capacity used
        </Text>
      </View>

      {/* Members List */}
      <View style={styles.membersList}>
        {members.map((member) => (
          <View key={member.uid} style={styles.memberCard}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>
                {member.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.displayName}</Text>
              <Text style={styles.memberEmail}>{member.email}</Text>
              {member.role === 'admin' && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
              )}
            </View>

            {isAdmin && member.uid !== workspace.adminUid && (
              <TouchableOpacity
                onPress={() => handleRemoveMember(member.uid, member.displayName)}
                style={styles.removeButton}
              >
                <Ionicons name="close-circle" size={24} color="#DC2626" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* Add Member Button */}
      {isAdmin && members.length < workspace.maxUsersThisMonth && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push(`/workspace/${id}/invite-member` as any)}
        >
          <Ionicons name="person-add" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Invite Member</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
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
  capacityBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  capacityText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  membersList: {
    padding: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 13,
    color: Colors.textMedium,
    marginBottom: 4,
  },
  adminBadge: {
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

