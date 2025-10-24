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
import { extractActionItems, toggleActionItemStatus } from '../services/aiService';
import type { ActionItem } from '../types';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      loadActionItems();
    }
  }, [visible, conversationId]);

  const loadActionItems = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await extractActionItems(conversationId) as any;
      setItems(result.items || []);
    } catch (err: any) {
      console.error('Action items error:', err);
      setError(err.message || 'Failed to extract action items');
    } finally {
      setLoading(false);
    }
  };

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ff4444';
      case 'medium':
        return '#ffaa00';
      case 'low':
        return '#44ff44';
      default:
        return '#999999';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const handleClose = () => {
    setItems([]);
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
          <Text style={styles.headerTitle}>Action Items</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>
              Scanning for action items...
            </Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={loadActionItems}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
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
                          Due: {formatDate(item.dueDate)}
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
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>✓</Text>
                  <Text style={styles.emptyText}>No action items found</Text>
              <Text style={styles.emptySubtext}>
                AI didn&apos;t detect any tasks or to-dos in this conversation
              </Text>
                </View>
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
  itemCard: {
    backgroundColor: '#f8f8f8',
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
    borderColor: '#007AFF',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  itemTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
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
    color: '#666',
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
    color: '#666',
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

