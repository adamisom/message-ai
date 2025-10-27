import { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAIFeature } from '../hooks/useAIFeature';
import { suggestMeetingTimes } from '../services/aiService';
import { commonModalStyles } from '../styles/commonModalStyles';
import { Colors } from '../utils/colors';
import { EmptyState } from './modals/EmptyState';
import { ErrorState } from './modals/ErrorState';
import { LoadingState } from './modals/LoadingState';
import { ModalHeader } from './modals/ModalHeader';

interface MeetingSchedulerModalProps {
  visible: boolean;
  conversationId: string;
  onClose: () => void;
}

interface MeetingTime {
  dateTime: string;
  reasoning: string;
  confidence: number;
}

interface MeetingSuggestion {
  suggestedTimes: MeetingTime[];
  participants: string[];
  context: string;
  conflicts?: string[];
}

export function MeetingSchedulerModal({
  visible,
  conversationId,
  onClose,
}: MeetingSchedulerModalProps) {
  const [messageCount, setMessageCount] = useState(50);
  
  const result = useAIFeature<MeetingSuggestion>({
    visible,
    conversationId,
    fetchFunction: (convId) => suggestMeetingTimes(convId, messageCount) as Promise<MeetingSuggestion>,
    dependencies: [messageCount],
  });
  
  const { data: suggestion, loading, loadingSlowly, error, reload } = result;

  const handleClose = () => {
    onClose();
  };

  const handleCopyToClipboard = async () => {
    if (!suggestion) return;

    const text = formatSuggestionForClipboard(suggestion);
    await Clipboard.setStringAsync(text);
    
    Alert.alert(
      'Copied!',
      'Meeting suggestions copied to clipboard',
      [{ text: 'OK' }]
    );
  };

  const formatSuggestionForClipboard = (suggestion: MeetingSuggestion): string => {
    let text = 'Meeting Suggestions:\n\n';
    
    text += `Context: ${suggestion.context}\n\n`;
    
    text += 'Suggested Times:\n';
    suggestion.suggestedTimes.forEach((time, index) => {
      text += `${index + 1}. ${time.dateTime}\n`;
      text += `   ${time.reasoning}\n\n`;
    });

    if (suggestion.conflicts && suggestion.conflicts.length > 0) {
      text += 'Conflicts:\n';
      suggestion.conflicts.forEach((conflict) => {
        text += `• ${conflict}\n`;
      });
    }

    return text;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return Colors.success;
    if (confidence >= 0.6) return Colors.warning;
    return Colors.error;
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'High confidence';
    if (confidence >= 0.6) return 'Medium confidence';
    return 'Low confidence';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={commonModalStyles.container}>
        <ModalHeader title="Smart Meeting Scheduler" onClose={handleClose} />

        {/* Message Count Selector */}
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorLabel}>Messages to analyze:</Text>
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
            message={`Analyzing conversation for scheduling opportunities...`}
            submessage={loadingSlowly ? "Still working on it, thanks for your patience..." : "This may take a few seconds"}
          />
        )}

        {/* Error State */}
        {error && !loading && (
          <ErrorState error={error} onRetry={reload} />
        )}

        {/* Meeting Suggestions Content */}
        {suggestion && !loading && (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
          >
            {/* Context Section */}
            {suggestion.context && (
              <View style={styles.contextSection}>
                <Text style={styles.sectionTitle}>📋 Context</Text>
                <Text style={styles.contextText}>{suggestion.context}</Text>
              </View>
            )}

            {/* Suggested Times Section */}
            <View style={styles.timesSection}>
              <Text style={styles.sectionTitle}>🗓️ Suggested Times</Text>
              {suggestion.suggestedTimes.map((time, index) => (
                <View key={`time-${index}`} style={styles.timeCard}>
                  <View style={styles.timeHeader}>
                    <Text style={styles.timeNumber}>#{index + 1}</Text>
                    <View
                      style={[
                        styles.confidenceBadge,
                        { backgroundColor: getConfidenceColor(time.confidence) },
                      ]}
                    >
                      <Text style={styles.confidenceText}>
                        {Math.round(time.confidence * 100)}%
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.dateTimeText}>{time.dateTime}</Text>
                  <Text style={styles.reasoningText}>{time.reasoning}</Text>
                  <Text style={styles.confidenceLabel}>
                    {getConfidenceLabel(time.confidence)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Conflicts Section */}
            {suggestion.conflicts && suggestion.conflicts.length > 0 && (
              <View style={styles.conflictsSection}>
                <Text style={styles.sectionTitle}>⚠️ Conflicts</Text>
                {suggestion.conflicts.map((conflict, index) => (
                  <View key={`conflict-${index}`} style={styles.conflictItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.conflictText}>{conflict}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Copy Button */}
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyToClipboard}
            >
              <Text style={styles.copyButtonText}>📋 Copy to Clipboard</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Suggestions based on {messageCount} messages • Powered by AI
              </Text>
            </View>
          </ScrollView>
        )}

        {/* Empty State */}
        {!loading && !error && !suggestion && (
          <EmptyState
            icon="📅"
            message="AI will analyze your conversation and suggest optimal meeting times"
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
  contextSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 12,
  },
  contextText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textMedium,
  },
  timesSection: {
    marginBottom: 24,
  },
  timeCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  confidenceBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  dateTimeText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  reasoningText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textMedium,
    marginBottom: 4,
  },
  confidenceLabel: {
    fontSize: 12,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  conflictsSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#FFF4E6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  conflictItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    color: Colors.warning,
    marginRight: 8,
    marginTop: 2,
  },
  conflictText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textMedium,
  },
  copyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textWhite,
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

