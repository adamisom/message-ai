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
import { extractActionItems, toggleActionItemStatus } from '../services/aiService';
import { commonModalStyles } from '../styles/commonModalStyles';
import type { ActionItem } from '../types';
import { getPriorityColor } from '../utils/colorHelpers';
import { Colors } from '../utils/colors';
import { formatDateString } from '../utils/dateFormat';
import { EmptyState } from './modals/EmptyState';
import { ErrorState } from './modals/ErrorState';
import { LoadingState } from './modals/LoadingState';
import { ModalHeader } from './modals/ModalHeader';

interface ActionItemsModalProps {
  visible: boolean;
  conversationId: string;
  onClose: () => void;
}

export function ActionItemsModal({
  visible,
  conversationId,
  onClose,
}: ActionItemsModalProps) {
  const [items, setItems] = useState<ActionItem[]>([]);
  
  const { data, loading, loadingSlowly, error, reload } = useAIFeature({
    visible,
    conversationId,
    fetchFunction: extractActionItems,
  });

  // Update local state when data changes
  if (data && items !== (data as any).items) {
    setItems((data as any).items || []);
  }

  const handleToggleStatus = async (itemId: string, currentStatus: string) => {
    const newStatus: 'pending' | 'completed' = currentStatus === 'pending' ? 'completed' : 'pending';

    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? {...item, status: newStatus} : item
      )
    );

    try {
      await toggleActionItemStatus(conversationId, itemId, newStatus);
    } catch (err: any) {
      console.error('Toggle status error:', err);
      // Revert on error
      const revertStatus: 'pending' | 'completed' = newStatus === 'completed' ? 'pending' : 'completed';
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? {...item, status: revertStatus} : item
        )
      );
    }
  };

  const handleClose = () => {
    setItems([]);
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
        <ModalHeader title="Action Items" onClose={handleClose} />

        {/* Loading State */}
        {loading && (
          <LoadingState
            message="Scanning for action items..."
            submessage={loadingSlowly ? "Still working on it, thanks for your patience..." : undefined}
          />
        )}

        {/* Error State */}
        {error && !loading && (
          <ErrorState message={error} onRetry={reload} />
        )}

        {/* Action Items List */}
        {!loading && !error && (
          <FlatList
            data={items}
            keyExtractor={(item, index) => item.id || `item-${index}`}
            renderItem={({item}) => (
              <View
                style={[
                  styles.itemCard,
                  {borderLeftColor: getPriorityColor(item.priority)},
                ]}
              >
                <View style={styles.itemHeader}>
                  <TouchableOpacity
                    onPress={() => handleToggleStatus(item.id, item.status)}
                    style={styles.checkbox}
                  >
                    <Text style={styles.checkboxText}>
                      {item.status === 'completed' ? '✓' : ''}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.itemContent}>
                    <Text
                      style={[
                        styles.itemText,
                        item.status === 'completed' && styles.itemTextCompleted,
                      ]}
                    >
                      {item.text}
                    </Text>

                    {item.assigneeDisplayName && (
                      <View style={styles.assigneeContainer}>
                        <Text style={styles.assigneeIcon}>👤</Text>
                        <Text style={styles.assigneeText}>
                          {item.assigneeDisplayName}
                        </Text>
                      </View>
                    )}

                    {item.dueDate && (
                      <View style={styles.dueDateContainer}>
                        <Text style={styles.dueDateIcon}>📅</Text>
                        <Text style={styles.dueDateText}>
                          Due: {formatDateString(item.dueDate)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.priorityBadge}>
                      <View
                        style={[
                          styles.priorityDot,
                          {backgroundColor: getPriorityColor(item.priority)},
                        ]}
                      />
                      <Text style={styles.priorityText}>
                        {item.priority.toUpperCase()} PRIORITY
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
            ListEmptyComponent={
              !loading && !error ? (
                <EmptyState
                  icon="✓"
                  message="No action items found"
                  submessage="AI didn't detect any tasks or to-dos in this conversation"
                />
              ) : null
            }
            contentContainerStyle={[
              styles.listContent,
              items.length === 0 && styles.listContentEmpty,
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
  itemCard: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  itemHeader: {
    flexDirection: 'row',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    color: Colors.textDark,
    marginBottom: 8,
  },
  itemTextCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textLight,
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  assigneeIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  assigneeText: {
    fontSize: 14,
    color: Colors.textMedium,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dueDateIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  dueDateText: {
    fontSize: 14,
    color: Colors.textMedium,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textLight,
  },
});
