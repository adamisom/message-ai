/**
 * Sub-Phase 6.5: Unified Invitations Screen
 * View and respond to workspace and group chat invitations
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
import { 
  getUserDirectMessageInvitations, 
  acceptDirectMessageInvitation, 
  declineDirectMessageInvitation, 
  reportDirectMessageInvitationSpam 
} from '../../services/dmInvitationService';
import {
  getUserGroupChatInvitations,
  acceptGroupChatInvitation,
  declineGroupChatInvitation,
  reportGroupChatInvitationSpam,
} from '../../services/groupChatService';
import {
  getUserWorkspaceInvitations,
  acceptWorkspaceInvitation,
  declineWorkspaceInvitation,
  reportWorkspaceInvitationAsSpam,
} from '../../services/workspaceService';
import { useAuthStore } from '../../store/authStore';
import { Alerts } from '../../utils/alerts';
import { Colors } from '../../utils/colors';

type InvitationType = 'workspace' | 'group_chat' | 'direct_message';

interface UnifiedInvitation {
  id: string;
  type: InvitationType;
  name: string; // workspace name or conversation name
  invitedByDisplayName: string;
  sentAt: any;
  // Workspace-specific
  workspaceId?: string;
  workspaceName?: string;
  // Group chat-specific
  conversationId?: string;
  conversationName?: string;
}

export default function InvitationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [invitations, setInvitations] = useState<UnifiedInvitation[]>([]);
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
      // Load workspace, group chat, and DM invitations
      const [workspaceInvites, groupChatInvites, dmInvites] = await Promise.all([
        getUserWorkspaceInvitations(user.uid),
        getUserGroupChatInvitations(user.uid),
        getUserDirectMessageInvitations(user.uid),
      ]);

      // Combine and format invitations
      const combined: UnifiedInvitation[] = [
        ...workspaceInvites.map((inv: any) => ({
          id: inv.id,
          type: 'workspace' as InvitationType,
          name: inv.workspaceName,
          invitedByDisplayName: inv.invitedByDisplayName,
          sentAt: inv.sentAt,
          workspaceId: inv.workspaceId,
          workspaceName: inv.workspaceName,
        })),
        ...groupChatInvites.map((inv: any) => ({
          id: inv.id,
          type: 'group_chat' as InvitationType,
          name: inv.conversationName || 'Group Chat',
          invitedByDisplayName: inv.inviterName,
          sentAt: inv.invitedAt,
          conversationId: inv.conversationId,
        })),
        ...dmInvites.map((inv: any) => ({
          id: inv.id,
          type: 'direct_message' as InvitationType,
          name: `${inv.inviterName}`,
          invitedByDisplayName: inv.inviterName,
          sentAt: inv.sentAt,
          inviterPhone: inv.inviterPhoneNumber,
        })),
      ];

      // Sort by sentAt (newest first)
      combined.sort((a, b) => {
        const aTime = a.sentAt?.toMillis?.() || 0;
        const bTime = b.sentAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setInvitations(combined);
    } catch (error) {
      console.error('Error loading invitations:', error);
      Alerts.error('Failed to load invitations');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInvitations();
  };

  const handleAccept = async (invitation: UnifiedInvitation) => {
    setProcessingId(invitation.id);
    try {
      if (invitation.type === 'workspace') {
        await acceptWorkspaceInvitation(invitation.id);
        await loadInvitations(); // Refresh immediately so invitation disappears
        Alerts.success(`You've joined ${invitation.name}`);
      } else if (invitation.type === 'group_chat') {
        await acceptGroupChatInvitation(invitation.id);
        await loadInvitations(); // Refresh immediately so invitation disappears
        Alerts.success(`You've joined ${invitation.name}`);
      } else {
        // DM invitation
        const result = await acceptDirectMessageInvitation(invitation.id);
        await loadInvitations(); // Refresh immediately so invitation disappears
        Alerts.confirm(
          'Success!',
          `You can now message ${invitation.name}`,
          () => router.push(`/chat/${result.conversationId}` as any),
          { confirmText: 'Open Chat', cancelText: 'Later' }
        );
      }
    } catch (error: any) {
      console.error('Accept invitation error:', error);
      Alerts.error(error.message || 'Failed to accept invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitation: UnifiedInvitation) => {
    const typeLabel = invitation.type === 'workspace' ? 'workspace' : invitation.type === 'group_chat' ? 'group chat' : 'direct message';
    Alerts.confirm(
      'Decline Invitation?',
      `Decline invitation to join ${invitation.name} (${typeLabel})?`,
      async () => {
        setProcessingId(invitation.id);
        try {
          if (invitation.type === 'workspace') {
            await declineWorkspaceInvitation(invitation.id);
          } else if (invitation.type === 'group_chat') {
            await declineGroupChatInvitation(invitation.id);
          } else {
            await declineDirectMessageInvitation(invitation.id);
          }
          await loadInvitations();
        } catch (error: any) {
          console.error('Decline invitation error:', error);
          Alerts.error(error.message || 'Failed to decline invitation');
        } finally {
          setProcessingId(null);
        }
      },
      { confirmText: 'Decline', isDestructive: true }
    );
  };

  const handleReportSpam = async (invitation: UnifiedInvitation) => {
    Alerts.confirm(
      'Report as Spam?',
      `Report this invitation from ${invitation.invitedByDisplayName} as spam?\n\nThis will increment their spam strike count.`,
      async () => {
        setProcessingId(invitation.id);
        try {
          if (invitation.type === 'workspace') {
            await reportWorkspaceInvitationAsSpam(invitation.id);
          } else if (invitation.type === 'group_chat') {
            await reportGroupChatInvitationSpam(invitation.id);
          } else {
            await reportDirectMessageInvitationSpam(invitation.id);
          }

          Alerts.success('Thank you for helping keep MessageAI safe.', () => loadInvitations());
        } catch (error: any) {
          console.error('Report spam error:', error);
          Alerts.error(error.message || 'Failed to report spam');
        } finally {
          setProcessingId(null);
        }
      },
      { confirmText: 'Report Spam', isDestructive: true }
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
        <Text style={styles.headerTitle}>Invitations</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {invitations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="mail-open-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No Invitations</Text>
            <Text style={styles.emptyDescription}>
              You&apos;ll see workspace, group chat, and direct message invitations here
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
  invitation: UnifiedInvitation;
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
    const date =
      typeof timestamp === 'number' ? new Date(timestamp) : timestamp.toDate?.() || new Date();

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

  const isWorkspace = invitation.type === 'workspace';
  const isGroupChat = invitation.type === 'group_chat';
  const isDM = invitation.type === 'direct_message';
  
  let iconName: any = 'business';
  let iconColor: string = Colors.primary;
  let bgColor: string = '#E3F2FD';
  
  if (isGroupChat) {
    iconName = 'people';
    iconColor = '#10B981';
    bgColor = '#D1FAE5';
  } else if (isDM) {
    iconName = 'chatbubble';
    iconColor = '#6B7280';
    bgColor = '#F3F4F6';
  }

  return (
    <View style={styles.card}>
      {/* Invitation Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.workspaceIcon, { backgroundColor: bgColor }]}>
          <Ionicons name={iconName} size={24} color={iconColor} />
        </View>
        <View style={styles.cardHeaderText}>
          <View style={styles.nameRow}>
            <Text style={styles.workspaceName}>{invitation.name}</Text>
            <View style={[
              styles.typeBadge,
              isWorkspace ? styles.workspaceBadge : isGroupChat ? styles.groupChatBadge : styles.dmBadge
            ]}>
              <Text style={styles.typeBadgeText}>
                {isWorkspace ? 'Workspace' : isGroupChat ? 'Group' : 'DM'}
              </Text>
            </View>
          </View>
          <Text style={styles.inviterText}>Invited by {invitation.invitedByDisplayName}</Text>
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
            <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={onAccept}>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.declineButton]} onPress={onDecline}>
              <Ionicons name="close-circle-outline" size={20} color={Colors.textMedium} />
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.spamButton} onPress={onReportSpam}>
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
    paddingTop: 60,
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  workspaceName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginRight: 8,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  workspaceBadge: {
    backgroundColor: '#E3F2FD',
  },
  groupChatBadge: {
    backgroundColor: '#D1FAE5',
  },
  dmBadge: {
    backgroundColor: '#F3F4F6',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMedium,
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

