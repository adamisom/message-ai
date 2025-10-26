import { useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAIFeature } from '../hooks/useAIFeature';
import { generateSummary } from '../services/aiService';
import { commonModalStyles } from '../styles/commonModalStyles';
import { Colors } from '../utils/colors';
import { EmptyState } from './modals/EmptyState';
import { ErrorState } from './modals/ErrorState';
import { LoadingState } from './modals/LoadingState';
import { ModalHeader } from './modals/ModalHeader';

interface SummaryModalProps {
  visible: boolean;
  conversationId: string;
  onClose: () => void;
}

export function SummaryModal({
  visible,
  conversationId,
  onClose,
}: SummaryModalProps) {
  const [messageCount, setMessageCount] = useState(50);
  
  const result = useAIFeature<any>({
    visible,
    conversationId,
    fetchFunction: (convId) => generateSummary(convId, messageCount),
    dependencies: [messageCount],
  });
  
  const { data: summary, loading, loadingSlowly, error, reload } = result;

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
        {summary && !loading && (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
          >
            {(summary as any).summary && (
              <View style={styles.summarySection}>
                <Text style={styles.sectionTitle}>Summary</Text>
                <Text style={styles.summaryText}>{(summary as any).summary}</Text>
              </View>
            )}

            {((summary as any).keyPoints && Array.isArray((summary as any).keyPoints)) && (
              <View style={styles.keyPointsSection}>
                <Text style={styles.sectionTitle}>Key Points</Text>
                {(summary as any).keyPoints.map((point: string, index: number) => (
                  <View key={`keypoint-${index}`} style={styles.keyPointItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.keyPointText}>{point}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Summary generated from {(summary as any).messageCount || messageCount}{' '}
                messages
              </Text>
            </View>
          </ScrollView>
        )}

        {/* Empty State */}
        {!loading && !error && !summary && (
          <EmptyState
            icon="📝"
            message="Get an AI-powered summary of this conversation"
          />
        )}
      </View>
    </Modal>
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
