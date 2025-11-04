import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAIFeature } from '../hooks/useAIFeature';
import { saveEditedDecision, trackDecisions } from '../services/aiService';
import { useAuthStore } from '../store/authStore';
import { commonModalStyles } from '../styles/commonModalStyles';
import { Decision } from '../types';
import { Alerts } from '../utils/alerts';
import { getConfidenceColor } from '../utils/colorHelpers';
import { Colors } from '../utils/colors';
import { formatDateDetailed } from '../utils/dateFormat';
import EditDecisionModal from './EditDecisionModal';
import { EmptyState } from './modals/EmptyState';
import { ErrorState } from './modals/ErrorState';
import { LoadingState } from './modals/LoadingState';
import { ModalHeader } from './modals/ModalHeader';

interface DecisionsModalProps {
  visible: boolean;
  conversationId: string;
  isWorkspaceChat?: boolean;
  isAdmin?: boolean;
  onClose: () => void;
}

export function DecisionsModal({
  visible,
  conversationId,
  isWorkspaceChat = false,
  isAdmin: isAdminProp = false,
  onClose,
}: DecisionsModalProps) {
  const { user } = useAuthStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDecision, setEditingDecision] = useState<Decision | null>(null);
  const [viewMode, setViewMode] = useState<'saved' | 'fresh'>('saved');
  const [freshAiDecisions, setFreshAiDecisions] = useState<Decision[] | null>(null);
  
  const { data, loading, loadingSlowly, error, reload } = useAIFeature<any>({
    visible,
    conversationId,
    fetchFunction: (convId) => trackDecisions(convId),
  });

  const decisions = (data as any)?.decisions || [];

  // Determine if user can edit
  const canEdit = isWorkspaceChat ? isAdminProp : user?.isPaidUser;
  
  // Check if decisions have been edited
  const hasSavedVersion = decisions.some((d: Decision) => d.editedByAdmin === true);

  // Display decisions based on view mode
  const displayedDecisions = viewMode === 'fresh' && freshAiDecisions ? freshAiDecisions : decisions;

  const handleClose = () => {
    setShowEditModal(false);
    setEditingDecision(null);
    setViewMode('saved');
    setFreshAiDecisions(null);
    onClose();
  };

  const handleEditPress = (decision: Decision) => {
    onClose(); // Close main modal first
    setTimeout(() => {
    setEditingDecision(decision);
    setShowEditModal(true);
    }, 300);
  };

  const handleSaveEdit = async (editedDecision: string, editedContext: string) => {
    if (!editingDecision) return;
    
    try {
      await saveEditedDecision(
        conversationId,
        editingDecision.id,
        editedDecision,
        editedContext
      );
      setShowEditModal(false);
      setEditingDecision(null);
      Alerts.success('Decision saved successfully');
      // Don't reload here - user needs to reopen Decisions modal to see it
    } catch (error: any) {
      throw error; // Let EditDecisionModal handle it
    }
  };

  const handleGetFreshAI = async () => {
    try {
      const fresh = await trackDecisions(conversationId) as any;
      const freshDecisions = fresh.decisions || [];
      setFreshAiDecisions(freshDecisions);
      setViewMode('fresh');
    } catch (error: any) {
      Alerts.error(error.message || 'Failed to generate fresh decisions');
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <View style={commonModalStyles.container}>
          <ModalHeader title="Decisions" onClose={handleClose} />

          {/* Loading State */}
          {loading && (
            <LoadingState
              message="Analyzing decisions..."
              submessage={loadingSlowly ? "Still working on it, thanks for your patience..." : undefined}
            />
          )}

          {/* Error State */}
          {error && !loading && (
            <ErrorState error={error} onRetry={reload} />
          )}

          {/* Decisions List */}
          {!loading && !error && (
            <>
            <FlatList
              data={displayedDecisions}
              keyExtractor={(item, index) => item.id || `decision-${index}`}
              renderItem={({item}) => (
                <View style={styles.decisionCard}>
                  {/* Timeline Indicator */}
                  <View style={styles.timelineContainer}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineLine} />
                  </View>

                  {/* Decision Content */}
                  <View style={styles.decisionContent}>
                    {/* Edited Badge */}
                    {item.editedByAdmin && viewMode === 'saved' && (
                      <View style={styles.editedBadge}>
                        <Ionicons name="pencil" size={14} color={Colors.primary} />
                        <Text style={styles.editedBadgeText}>Edited by Admin</Text>
                      </View>
                    )}

                    {/* Date */}
                    <Text style={styles.dateText}>
                      {formatDateDetailed(item.decidedAt)}
                    </Text>

                    {/* Decision Text */}
                    <Text style={styles.decisionText}>{item.decision}</Text>

                    {/* Context */}
                    <Text style={styles.contextText}>{item.context}</Text>

                    {/* Edit Button (only in saved view) */}
                    {canEdit && viewMode === 'saved' && (
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditPress(item)}
                      >
                        <Ionicons name="pencil" size={16} color={Colors.primary} />
                        <Text style={styles.editButtonText}>
                          {item.editedByAdmin ? 'Re-edit' : 'Edit & Save'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Footer */}
                    <View style={styles.footer}>
                      {/* Confidence Badge */}
                      <View style={styles.confidenceBadge}>
                        <View
                          style={[
                            styles.confidenceDot,
                            {backgroundColor: getConfidenceColor(item.confidence)},
                          ]}
                        />
                        <Text style={styles.confidenceText}>
                          {Math.round(item.confidence * 100)}% confidence
                        </Text>
                      </View>

                      {/* Participants Count */}
                      {item.participants && item.participants.length > 0 && (
                        <Text style={styles.participantsText}>
                          {item.participants.length}{' '}
                          {item.participants.length === 1
                            ? 'participant'
                            : 'participants'}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                !loading && !error ? (
                  <EmptyState
                    icon="💡"
                    message="No decisions found"
                    submessage="AI didn't detect any clear decisions in this conversation"
                  />
                ) : null
              }
              contentContainerStyle={[
                styles.listContent,
                displayedDecisions.length === 0 && styles.listContentEmpty,
              ]}
            />

            {/* Toggle Buttons */}
            {canEdit && displayedDecisions.length > 0 && (
              <View style={styles.actionButtons}>
                {hasSavedVersion && viewMode === 'saved' && (
                  <TouchableOpacity
                    style={styles.freshButton}
                    onPress={handleGetFreshAI}
                  >
                    <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
                    <Text style={styles.freshButtonText}>Get Fresh AI Analysis</Text>
                  </TouchableOpacity>
                )}

                {viewMode === 'fresh' && (
                  <TouchableOpacity
                    style={styles.freshButton}
                    onPress={() => setViewMode('saved')}
                  >
                    <Ionicons name="bookmark-outline" size={18} color={Colors.primary} />
                    <Text style={styles.freshButtonText}>View Your Saved Version</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            </>
          )}
        </View>
      </Modal>

      {/* Edit Modal */}
      <EditDecisionModal
        visible={showEditModal}
        decision={editingDecision}
        onClose={() => {
          setShowEditModal(false);
          setEditingDecision(null);
          // Don't re-open the main modal, just stay closed
        }}
        onSave={handleSaveEdit}
      />
    </>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
  },
  decisionCard: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    marginTop: 4,
  },
  decisionContent: {
    flex: 1,
    backgroundColor: Colors.backgroundGray,
    borderRadius: 8,
    padding: 12,
  },
  editedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  editedBadgeText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 8,
  },
  decisionText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  contextText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textMedium,
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 12,
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  confidenceText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  participantsText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    backgroundColor: '#fff',
  },
  freshButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 6,
  },
  freshButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
