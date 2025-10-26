/**
 * HelpModal Component
 * 
 * Modal for help and support with refresh functionality and support info.
 * Used in the Profile screen.
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Linking,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../utils/colors';

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
}

export function HelpModal({ visible, onClose, onRefresh, isRefreshing }: HelpModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.helpModalContent}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.helpModalHeader}>
            <Text style={styles.helpModalTitle}>Help & Support</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.textDark} />
            </TouchableOpacity>
          </View>

          <View style={styles.helpModalBody}>
            {/* Refresh Button */}
            <TouchableOpacity
              style={[styles.refreshButtonLarge, isRefreshing && styles.refreshButtonDisabled]}
              onPress={onRefresh}
              activeOpacity={0.7}
              disabled={isRefreshing}
            >
              <Ionicons 
                name={isRefreshing ? "hourglass-outline" : "refresh"} 
                size={20} 
                color={isRefreshing ? '#999' : '#007AFF'} 
              />
              <Text style={[styles.refreshButtonLargeText, isRefreshing && styles.refreshButtonTextDisabled]}>
                {isRefreshing ? 'Refreshing All App Data...' : 'Refresh All App Data'}
              </Text>
            </TouchableOpacity>

            {/* Support Info */}
            <View style={styles.supportInfoContainer}>
              <Text style={styles.supportInfoText}>
                Support email for Pro users activates after 2nd bill, for now go to{' '}
                <Text 
                  style={styles.supportLink}
                  onPress={() => Linking.openURL('https://x.com/adam__isom')}
                >
                  https://x.com/adam__isom
                </Text>
              </Text>
            </View>

            {/* Source Info */}
            <View style={styles.sourceInfoContainer}>
              <Text style={styles.sourceInfoText}>
                (source code){' '}
                <Text 
                  style={styles.supportLink}
                  onPress={() => Linking.openURL('https://github.com/adamisom/message-ai')}
                >
                  https://github.com/adamisom/message-ai
                </Text>
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  helpModalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    position: 'relative',
  },
  helpModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
  },
  helpModalBody: {
    padding: 20,
  },
  refreshButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    borderWidth: 2,
    borderColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  refreshButtonDisabled: {
    opacity: 0.5,
    borderColor: '#999',
  },
  refreshButtonLargeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  refreshButtonTextDisabled: {
    color: '#999',
  },
  supportInfoContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  supportInfoText: {
    fontSize: 14,
    color: Colors.textMedium,
    lineHeight: 20,
  },
  sourceInfoContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
  },
  sourceInfoText: {
    fontSize: 14,
    color: Colors.textMedium,
    lineHeight: 20,
  },
  supportLink: {
    color: '#007AFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

