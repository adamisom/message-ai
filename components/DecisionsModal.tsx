import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useAIFeature } from '../hooks/useAIFeature';
import { trackDecisions } from '../services/aiService';
import { commonModalStyles } from '../styles/commonModalStyles';
import { getConfidenceColor } from '../utils/colorHelpers';
import { Colors } from '../utils/colors';
import { formatDateDetailed } from '../utils/dateFormat';
import { EmptyState } from './modals/EmptyState';
import { ErrorState } from './modals/ErrorState';
import { LoadingState } from './modals/LoadingState';
import { ModalHeader } from './modals/ModalHeader';

interface DecisionsModalProps {
  visible: boolean;
  conversationId: string;
  onClose: () => void;
}

export function DecisionsModal({
  visible,
  conversationId,
  onClose,
}: DecisionsModalProps) {
  const { data, loading, loadingSlowly, error, reload } = useAIFeature({
    visible,
    conversationId,
    fetchFunction: (convId) => trackDecisions(convId),
  });

  const decisions = (data as any)?.decisions || [];

  const handleClose = () => {
    onClose();
  };

  return (
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
          <FlatList
            data={decisions}
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
                  {/* Date */}
                  <Text style={styles.dateText}>
                    {formatDateDetailed(item.decidedAt)}
                  </Text>

                  {/* Decision Text */}
                  <Text style={styles.decisionText}>{item.decision}</Text>

                  {/* Context */}
                  <Text style={styles.contextText}>{item.context}</Text>

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
              decisions.length === 0 && styles.listContentEmpty,
            ]}
          />
        )}
      </View>
    </Modal>
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
});
