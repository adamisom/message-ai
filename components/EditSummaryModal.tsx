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
import { Summary } from '../types';

interface EditSummaryModalProps {
  visible: boolean;
  summary: Summary | null;
  onClose: () => void;
  onSave: (editedSummary: string, editedKeyPoints: string[]) => Promise<void>;
}

export default function EditSummaryModal({
  visible,
  summary,
  onClose,
  onSave,
}: EditSummaryModalProps) {
  const [editedSummary, setEditedSummary] = useState('');
  const [editedKeyPoints, setEditedKeyPoints] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize with current summary data when modal opens
  React.useEffect(() => {
    if (visible && summary) {
      setEditedSummary(summary.summary);
      setEditedKeyPoints([...summary.keyPoints]);
    }
  }, [visible, summary]);

  const handleAddKeyPoint = () => {
    setEditedKeyPoints([...editedKeyPoints, '']);
  };

  const handleUpdateKeyPoint = (index: number, value: string) => {
    const updated = [...editedKeyPoints];
    updated[index] = value;
    setEditedKeyPoints(updated);
  };

  const handleRemoveKeyPoint = (index: number) => {
    const updated = editedKeyPoints.filter((_, i) => i !== index);
    setEditedKeyPoints(updated);
  };

  const handleSave = async () => {
    // Validation
    if (!editedSummary.trim()) {
      Alert.alert('Error', 'Summary cannot be empty');
      return;
    }

    const nonEmptyKeyPoints = editedKeyPoints.filter(kp => kp.trim() !== '');
    if (nonEmptyKeyPoints.length === 0) {
      Alert.alert('Error', 'At least one key point is required');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editedSummary.trim(), nonEmptyKeyPoints);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save summary');
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
          <Text style={styles.headerTitle}>Edit Summary</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.saveButton}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Summary Text */}
          <Text style={styles.label}>Summary</Text>
          <TextInput
            style={styles.summaryInput}
            value={editedSummary}
            onChangeText={setEditedSummary}
            multiline
            placeholder="Enter summary text..."
            editable={!isSaving}
          />

          {/* Key Points */}
          <Text style={styles.label}>Key Points</Text>
          {editedKeyPoints.map((point, index) => (
            <View key={index} style={styles.keyPointRow}>
              <TextInput
                style={styles.keyPointInput}
                value={point}
                onChangeText={(value) => handleUpdateKeyPoint(index, value)}
                placeholder={`Key point ${index + 1}`}
                editable={!isSaving}
              />
              <TouchableOpacity
                onPress={() => handleRemoveKeyPoint(index)}
                disabled={isSaving}
              >
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddKeyPoint}
            disabled={isSaving}
          >
            <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.addButtonText}>Add Key Point</Text>
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  summaryInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  keyPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  keyPointInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginRight: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
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

