/**
 * Sub-Phase 4: Workspace Invitations Screen
 * View and respond to pending workspace invitations
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { functions } from '../../firebase.config';
import { getUserWorkspaceInvitations } from '../../services/workspaceService';
import { useAuthStore } from '../../store/authStore';
import type { WorkspaceInvitation } from '../../types';
import { Colors } from '../../utils/colors';

export default function WorkspaceInvitationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const loadInvitations = async () => {
    if (!user?.uid) return;
    
    try {
      const invites = await getUserWorkspaceInvitations(user.uid);
      setInvitations(invites);
    } catch (error) {
      console.error('Error loading invitations:', error);
      Alert.alert('Error', 'Failed to load invitations');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInvitations();
  };

  const handleAccept = async (invitation: WorkspaceInvitation) => {
    setProcessingId(invitation.id);
    try {
      const acceptFn = httpsCallable(functions, 'acceptWorkspaceInvitation');
      await acceptFn({ invitationId: invitation.id });
      
      Alert.alert(
        'Success!',
        `You've joined ${invitation.workspaceName}`,
        [{ text: 'OK', onPress: () => loadInvitations() }]
      );
    } catch (error: any) {
      console.error('Accept invitation error:', error);
      Alert.alert('Error', error.message || 'Failed to accept invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitation: WorkspaceInvitation) => {
    Alert.alert(
      'Decline Invitation?',
      `Decline invitation to join ${invitation.workspaceName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(invitation.id);
            try {
              const declineFn = httpsCallable(functions, 'declineWorkspaceInvitation');
              await declineFn({ invitationId: invitation.id });
              await loadInvitations();
            } catch (error: any) {
              console.error('Decline invitation error:', error);
              Alert.alert('Error', error.message || 'Failed to decline invitation');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleReportSpam = async (invitation: WorkspaceInvitation) => {
    Alert.alert(
      'Report as Spam?',
      `Report this invitation from ${invitation.invitedByDisplayName} as spam?\n\nThis will increment their spam strike count.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report Spam',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(invitation.id);
            try {
              const reportFn = httpsCallable(functions, 'reportWorkspaceInvitationSpam');
              await reportFn({ invitationId: invitation.id });
              
              Alert.alert(
                'Reported',
                'Thank you for helping keep MessageAI safe.',
                [{ text: 'OK', onPress: () => loadInvitations() }]
              );
            } catch (error: any) {
              console.error('Report spam error:', error);
              Alert.alert('Error', error.message || 'Failed to report spam');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading invitations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workspace Invitations</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {invitations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="mail-open-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No Invitations</Text>
            <Text style={styles.emptyDescription}>
              You&apos;ll see workspace invitations here when someone invites you
            </Text>
          </View>
        ) : (
          invitations.map((invitation) => (
            <InvitationCard
              key={invitation.id}
              invitation={invitation}
              isProcessing={processingId === invitation.id}
              onAccept={() => handleAccept(invitation)}
              onDecline={() => handleDecline(invitation)}
              onReportSpam={() => handleReportSpam(invitation)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

interface InvitationCardProps {
  invitation: WorkspaceInvitation;
  isProcessing: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onReportSpam: () => void;
}

function InvitationCard({
  invitation,
  isProcessing,
  onAccept,
  onDecline,
  onReportSpam,
}: InvitationCardProps) {
  // Format date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = typeof timestamp === 'number'
      ? new Date(timestamp)
      : timestamp.toDate?.() || new Date();
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.card}>
      {/* Invitation Header */}
      <View style={styles.cardHeader}>
        <View style={styles.workspaceIcon}>
          <Ionicons name="business" size={24} color={Colors.primary} />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.workspaceName}>{invitation.workspaceName}</Text>
          <Text style={styles.inviterText}>
            Invited by {invitation.invitedByDisplayName}
          </Text>
          <Text style={styles.dateText}>{formatDate(invitation.sentAt)}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      {isProcessing ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      ) : (
        <>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={onAccept}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={onDecline}
            >
              <Ionicons name="close-circle-outline" size={20} color={Colors.textMedium} />
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.spamButton}
            onPress={onReportSpam}
          >
            <Ionicons name="flag-outline" size={16} color="#DC2626" />
            <Text style={styles.spamText}>Report as Spam</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textMedium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: '#FFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
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
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  workspaceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
    justifyContent: 'center',
  },
  workspaceName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 4,
  },
  inviterText: {
    fontSize: 13,
    color: Colors.textMedium,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  processingText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.textMedium,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: Colors.primary,
  },
  acceptText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  declineButton: {
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  declineText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMedium,
  },
  spamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  spamText: {
    fontSize: 13,
    color: '#DC2626',
    marginLeft: 4,
  },
});

