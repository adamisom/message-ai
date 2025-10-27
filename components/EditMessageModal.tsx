/**
 * Edit Message Modal
 * Sub-Phase 11 (Polish): Pro-only feature
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../utils/colors';

interface EditMessageModalProps {
  visible: boolean;
  onClose: () => void;
  originalText: string;
  onSave: (newText: string) => Promise<void>;
}

export function EditMessageModal({
  visible,
  onClose,
  originalText,
  onSave,
}: EditMessageModalProps) {
  const [text, setText] = useState(originalText);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const trimmedText = text.trim();
    
    if (trimmedText.length === 0) {
      Alert.alert('Error', 'Message cannot be empty');
      return;
    }

    if (trimmedText === originalText.trim()) {
      Alert.alert('No Changes', 'You haven&apos;t made any changes');
      return;
    }

    if (trimmedText.length > 10000) {
      Alert.alert('Error', 'Message cannot exceed 10,000 characters');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmedText);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to edit message');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={isSaving ? undefined : onClose}
      >
        <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Edit Message</Text>
            <TouchableOpacity onPress={onClose} disabled={isSaving}>
              <Ionicons name="close" size={24} color={Colors.textDark} />
            </TouchableOpacity>
          </View>

          {/* Text Input */}
          <View style={styles.body}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              multiline
              placeholder="Enter your message..."
              placeholderTextColor={Colors.textLight}
              autoFocus
              editable={!isSaving}
            />
            <Text style={styles.charCount}>
              {text.length} / 10,000 characters
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, isSaving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
  },
  body: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.textDark,
    minHeight: 120,
    maxHeight: 300,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 8,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textDark,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

