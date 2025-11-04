import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Decision } from '../types';
import { Alerts } from '../utils/alerts';

interface EditDecisionModalProps {
  visible: boolean;
  decision: Decision | null;
  onClose: () => void;
  onSave: (editedDecision: string, editedContext: string) => Promise<void>;
}

export default function EditDecisionModal({
  visible,
  decision,
  onClose,
  onSave,
}: EditDecisionModalProps) {
  const [editedDecision, setEditedDecision] = useState('');
  const [editedContext, setEditedContext] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize with current decision data when modal opens
  React.useEffect(() => {
    if (visible && decision) {
      setEditedDecision(decision.decision);
      setEditedContext(decision.context);
    }
  }, [visible, decision]);

  const handleSave = async () => {
    // Validation
    if (!editedDecision.trim()) {
      Alerts.error('Decision cannot be empty');
      return;
    }

    if (!editedContext.trim()) {
      Alerts.error('Context cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editedDecision.trim(), editedContext.trim());
      onClose();
    } catch (error: any) {
      Alerts.error(error.message || 'Failed to save decision');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={isSaving}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Decision</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.saveButton}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Decision Text */}
          <Text style={styles.label}>Decision</Text>
          <TextInput
            style={styles.decisionInput}
            value={editedDecision}
            onChangeText={setEditedDecision}
            multiline
            placeholder="Enter the decision..."
            editable={!isSaving}
          />

          {/* Context Text */}
          <Text style={styles.label}>Context</Text>
          <TextInput
            style={styles.contextInput}
            value={editedContext}
            onChangeText={setEditedContext}
            multiline
            placeholder="Enter the context or reasoning..."
            editable={!isSaving}
          />
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
  decisionInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  contextInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 150,
    textAlignVertical: 'top',
    marginBottom: 24,
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

