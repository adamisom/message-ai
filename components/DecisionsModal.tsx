import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { trackDecisions } from '../services/aiService';
import type { Decision } from '../types';

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
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      loadDecisions();
    }
  }, [visible, conversationId]);

  const loadDecisions = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await trackDecisions(conversationId) as any;
      setDecisions(result.decisions || []);
    } catch (err: any) {
      console.error('Decisions error:', err);
      setError(err.message || 'Failed to track decisions');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date =
      timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return '#44ff44';
    if (confidence >= 0.8) return '#88ff88';
    return '#ffaa00';
  };

  const handleClose = () => {
    setDecisions([]);
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Decisions</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Analyzing decisions...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadDecisions} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
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
                    {formatDate(item.decidedAt)}
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
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>💡</Text>
                  <Text style={styles.emptyText}>No decisions found</Text>
              <Text style={styles.emptySubtext}>
                AI didn&apos;t detect any clear decisions in this conversation
              </Text>
                </View>
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
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
    backgroundColor: '#007AFF',
    marginTop: 4,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#e0e0e0',
    marginTop: 4,
  },
  decisionContent: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  decisionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  contextText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
    color: '#999',
  },
  participantsText: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

