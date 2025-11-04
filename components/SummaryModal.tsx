import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAIFeature } from '../hooks/useAIFeature';
import { generateSummary, saveEditedSummary } from '../services/aiService';
import { useAuthStore } from '../store/authStore';
import { commonModalStyles } from '../styles/commonModalStyles';
import { Summary } from '../types';
import { Alerts } from '../utils/alerts';
import { Colors } from '../utils/colors';
import EditSummaryModal from './EditSummaryModal';
import { EmptyState } from './modals/EmptyState';
import { ErrorState } from './modals/ErrorState';
import { LoadingState } from './modals/LoadingState';
import { ModalHeader } from './modals/ModalHeader';

interface SummaryModalProps {
  visible: boolean;
  conversationId: string;
  isWorkspaceChat?: boolean;
  isAdmin?: boolean;
  onClose: () => void;
}

export function SummaryModal({
  visible,
  conversationId,
  isWorkspaceChat = false,
  isAdmin = false,
  onClose,
}: SummaryModalProps) {
  const { user } = useAuthStore();
  const [messageCount, setMessageCount] = useState(50);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewMode, setViewMode] = useState<'saved' | 'fresh'>('saved');
  const [freshAiSummary, setFreshAiSummary] = useState<Summary | null>(null);
  
  const result = useAIFeature<any>({
    visible,
    conversationId,
    fetchFunction: (convId) => generateSummary(convId, messageCount),
    dependencies: [messageCount],
  });
  
  const { data: summary, loading, loadingSlowly, error, reload } = result;

  // Determine if user can edit
  const canEdit = isWorkspaceChat ? isAdmin : user?.isPaidUser;

  // Check if summary has been edited
  const hasSavedVersion = summary?.editedByAdmin === true;

  const handleClose = () => {
    setShowEditModal(false);
    setViewMode('saved');
    setFreshAiSummary(null);
    onClose();
  };

  const handleEditPress = () => {
    onClose(); // Close main modal first
    setTimeout(() => {
      setShowEditModal(true);
    }, 300);
  };

  const handleSaveEdit = async (editedSummary: string, editedKeyPoints: string[]) => {
    try {
      await saveEditedSummary(conversationId, editedSummary, editedKeyPoints);
      setShowEditModal(false);
      Alerts.success('Summary saved successfully');
      // Don't reload here - user needs to reopen Summary modal to see it
    } catch (error: any) {
      throw error; // Let EditSummaryModal handle it
    }
  };

  const handleGetFreshAI = async () => {
    try {
      const fresh = await generateSummary(conversationId, messageCount) as Summary;
      setFreshAiSummary(fresh);
      setViewMode('fresh');
    } catch (error: any) {
      Alerts.error(error.message || 'Failed to generate fresh summary');
    }
  };

  const displayedSummary = viewMode === 'fresh' && freshAiSummary ? freshAiSummary : summary;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <View style={commonModalStyles.container}>
          <ModalHeader title="Thread Summary" onClose={handleClose} />

          {/* Message Count Selector */}
          <View style={styles.selectorContainer}>
            <Text style={styles.selectorLabel}>Messages to summarize:</Text>
            <View style={styles.selectorButtons}>
              {[25, 50, 100].map((count) => (
                <TouchableOpacity
                  key={count}
                  onPress={() => setMessageCount(count)}
                  style={[
                    styles.selectorButton,
                    messageCount === count && styles.selectorButtonActive,
                  ]}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.selectorButtonText,
                      messageCount === count && styles.selectorButtonTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Loading State */}
          {loading && (
            <LoadingState
              message={`Analyzing ${messageCount} messages...`}
              submessage={loadingSlowly ? "Still working on it, thanks for your patience..." : "This may take a few seconds"}
            />
          )}

          {/* Error State */}
          {error && !loading && (
            <ErrorState error={error} onRetry={reload} />
          )}

          {/* Summary Content */}
          {displayedSummary && !loading && (
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
            >
              {/* Edited Badge */}
              {hasSavedVersion && viewMode === 'saved' && (
                <View style={styles.editedBadge}>
                  <Ionicons name="pencil" size={14} color={Colors.primary} />
                  <Text style={styles.editedBadgeText}>
                    Edited by Admin
                  </Text>
                </View>
              )}

              {displayedSummary.summary && (
                <View style={styles.summarySection}>
                  <Text style={styles.sectionTitle}>Summary</Text>
                  <Text style={styles.summaryText}>{displayedSummary.summary}</Text>
                </View>
              )}

              {(displayedSummary.keyPoints && Array.isArray(displayedSummary.keyPoints)) && (
                <View style={styles.keyPointsSection}>
                  <Text style={styles.sectionTitle}>Key Points</Text>
                  {displayedSummary.keyPoints.map((point: string, index: number) => (
                    <View key={`keypoint-${index}`} style={styles.keyPointItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.keyPointText}>{point}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Buttons */}
              {canEdit && (
                <View style={styles.actionButtons}>
                  {!hasSavedVersion && (
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={handleEditPress}
                    >
                      <Ionicons name="pencil-outline" size={18} color="#fff" />
                      <Text style={styles.editButtonText}>Edit & Save</Text>
                    </TouchableOpacity>
                  )}

                  {hasSavedVersion && viewMode === 'saved' && (
                    <>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={handleEditPress}
                      >
                        <Ionicons name="pencil-outline" size={18} color="#fff" />
                        <Text style={styles.editButtonText}>Re-edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.freshButton}
                        onPress={handleGetFreshAI}
                      >
                        <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
                        <Text style={styles.freshButtonText}>Get Fresh AI Analysis</Text>
                      </TouchableOpacity>
                    </>
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

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Summary generated from {displayedSummary.messageCount || messageCount}{' '}
                  messages
                </Text>
              </View>
            </ScrollView>
          )}

          {/* Empty State */}
          {!loading && !error && !displayedSummary && (
            <EmptyState
              icon="📝"
              message="Get an AI-powered summary of this conversation"
            />
          )}
        </View>
      </Modal>

      {/* Edit Modal */}
      <EditSummaryModal
        visible={showEditModal}
        summary={displayedSummary}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
      />
    </>
  );
}

const styles = StyleSheet.create({
  selectorContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  selectorLabel: {
    fontSize: 14,
    color: Colors.textMedium,
    marginBottom: 8,
  },
  selectorButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectorButtonActive: {
    backgroundColor: Colors.primary,
  },
  selectorButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textDark,
  },
  selectorButtonTextActive: {
    color: Colors.textWhite,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  editedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  editedBadgeText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  summarySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textMedium,
  },
  keyPointsSection: {
    marginBottom: 24,
  },
  keyPointItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    color: Colors.primary,
    marginRight: 8,
    marginTop: 2,
  },
  keyPointText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textMedium,
  },
  actionButtons: {
    marginBottom: 24,
    gap: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  freshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  freshButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
  },
});
