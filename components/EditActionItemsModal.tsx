import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { ActionItem } from '../types';

interface EditActionItemsModalProps {
  visible: boolean;
  actionItems: ActionItem[];
  onClose: () => void;
  onSave: (editedItems: ActionItem[]) => Promise<void>;
}

export default function EditActionItemsModal({
  visible,
  actionItems,
  onClose,
  onSave,
}: EditActionItemsModalProps) {
  const [editedItems, setEditedItems] = useState<ActionItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize with current action items when modal opens
  React.useEffect(() => {
    if (visible && actionItems) {
      setEditedItems(JSON.parse(JSON.stringify(actionItems))); // Deep copy
    }
  }, [visible, actionItems]);

  const handleUpdateItem = (index: number, field: keyof ActionItem, value: any) => {
    const updated = [...editedItems];
    (updated[index] as any)[field] = value;
    setEditedItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = editedItems.filter((_, i) => i !== index);
    setEditedItems(updated);
  };

  const handleAddItem = () => {
    const newItem: ActionItem = {
      id: `temp_${Date.now()}`,
      text: '',
      assigneeUid: null,
      assigneeDisplayName: null,
      assigneeEmail: null,
      dueDate: null,
      sourceMessageId: '',
      priority: 'medium',
      status: 'pending',
      sourceType: 'ai',
      extractedAt: new Date(),
      extractedBy: 'system',
    };
    setEditedItems([...editedItems, newItem]);
  };

  const handleSave = async () => {
    // Validation
    const nonEmptyItems = editedItems.filter(item => item.text.trim() !== '');
    if (nonEmptyItems.length === 0) {
      Alert.alert('Error', 'At least one action item is required');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(nonEmptyItems);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save action items');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={isSaving}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Action Items</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.saveButton}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {editedItems.map((item, index) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNumber}>Item {index + 1}</Text>
                <TouchableOpacity
                  onPress={() => handleRemoveItem(index)}
                  disabled={isSaving}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Task</Text>
              <TextInput
                style={styles.textInput}
                value={item.text}
                onChangeText={(value) => handleUpdateItem(index, 'text', value)}
                placeholder="Enter task description..."
                multiline
                editable={!isSaving}
              />

              <Text style={styles.label}>Assignee (optional)</Text>
              <TextInput
                style={styles.textInput}
                value={item.assigneeDisplayName || ''}
                onChangeText={(value) => handleUpdateItem(index, 'assigneeDisplayName', value)}
                placeholder="Assignee name..."
                editable={!isSaving}
              />

              <Text style={styles.label}>Priority</Text>
              <View style={styles.priorityRow}>
                {(['high', 'medium', 'low'] as const).map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityButton,
                      item.priority === priority && styles.priorityButtonActive,
                    ]}
                    onPress={() => handleUpdateItem(index, 'priority', priority)}
                    disabled={isSaving}
                  >
                    <Text
                      style={[
                        styles.priorityButtonText,
                        item.priority === priority && styles.priorityButtonTextActive,
                      ]}
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddItem}
            disabled={isSaving}
          >
            <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.addButtonText}>Add Action Item</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButtonBottom, isSaving && styles.disabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonBottomText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  saveButton: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#000',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 6,
    padding: 10,
    fontSize: 15,
    marginBottom: 12,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  priorityButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  priorityButtonText: {
    fontSize: 14,
    color: '#000',
  },
  priorityButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  addButtonText: {
    fontSize: 15,
    color: '#007AFF',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 17,
    color: '#000',
  },
  saveButtonBottom: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveButtonBottomText: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});

