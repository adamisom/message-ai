/**
 * User Settings Modal
 * Sub-Phase 11 (Polish): DM Privacy Settings
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Alerts } from '../utils/alerts';
import { Colors } from '../utils/colors';

interface UserSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  currentSetting: 'private' | 'public';
  onSave: (newSetting: 'private' | 'public') => Promise<void>;
}

export function UserSettingsModal({
  visible,
  onClose,
  currentSetting,
  onSave,
}: UserSettingsModalProps) {
  const [dmSetting, setDmSetting] = useState<'private' | 'public'>(currentSetting);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (dmSetting === currentSetting) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(dmSetting);
      Alerts.success('Your privacy settings have been updated');
      onClose();
    } catch (error: any) {
      Alerts.error(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (value: boolean) => {
    setDmSetting(value ? 'public' : 'private');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            style={styles.saveButton}
          >
            {isSaving ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* DM Privacy Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Direct Message Privacy</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>
                  {dmSetting === 'private' ? '🔒 Private' : '🌐 Public'}
                </Text>
                <Text style={styles.settingDescription}>
                  {dmSetting === 'private'
                    ? 'Require invitation before direct messages'
                    : 'Anyone can send you direct messages'}
                </Text>
              </View>
              <Switch
                value={dmSetting === 'public'}
                onValueChange={handleToggle}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.infoText}>
                {dmSetting === 'private'
                  ? 'When private, people must send you an invitation which you can accept or decline. This helps prevent unwanted messages.'
                  : 'When public, anyone can start a direct message conversation with you immediately.'}
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="phone-portrait-outline" size={20} color={Colors.textMedium} />
              <Text style={styles.infoText}>
                <Text style={styles.boldText}>Note:</Text> Your phone number is always
                searchable because the purpose of this app is messaging functionality on top of
                phone numbers.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#fff',
  },
  closeButton: {
    padding: 4,
    width: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
  },
  saveButton: {
    padding: 4,
    width: 60,
    alignItems: 'flex-end',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.textMedium,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textMedium,
    marginLeft: 8,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '600',
    color: Colors.textDark,
  },
});

