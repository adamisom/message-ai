import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { Colors } from '../utils/colors';

interface MessageToolbarProps {
  visible: boolean;
  message: any | null;
  isWorkspaceChat: boolean;
  isAdmin: boolean;
  isOwnMessage: boolean;
  onClose: () => void;
  onMarkUrgent?: () => void;
  onUnmarkUrgent?: () => void;
  onPin?: () => void;
  onReportSpam?: () => void;
}

export default function MessageToolbar({
  visible,
  message,
  isWorkspaceChat,
  isAdmin,
  isOwnMessage,
  onClose,
  onMarkUrgent,
  onUnmarkUrgent,
  onPin,
  onReportSpam,
}: MessageToolbarProps) {
  if (!message) return null;

  const isMarkedUrgent = message.manuallyMarkedUrgent === true;
  const canMarkUrgent = isWorkspaceChat && isAdmin;
  const canPin = isWorkspaceChat && isAdmin;
  const canReportSpam = !isWorkspaceChat && !isOwnMessage; // Direct messages only, not own

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.toolbar}>
              {/* Mark/Unmark Urgent */}
              {canMarkUrgent && onMarkUrgent && onUnmarkUrgent && (
                <TouchableOpacity
                  style={styles.toolbarItem}
                  onPress={() => {
                    if (isMarkedUrgent) {
                      onUnmarkUrgent();
                    } else {
                      onMarkUrgent();
                    }
                    onClose();
                  }}
                >
                  <Ionicons
                    name={isMarkedUrgent ? "flash" : "flash-outline"}
                    size={22}
                    color={isMarkedUrgent ? "#FF9500" : Colors.textDark}
                  />
                  <Text style={styles.toolbarText}>
                    {isMarkedUrgent ? 'Unmark Urgent' : 'Mark Urgent'}
                  </Text>
                  {isMarkedUrgent && (
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentBadgeText}>URGENT</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* Pin Message */}
              {canPin && onPin && (
                <TouchableOpacity
                  style={styles.toolbarItem}
                  onPress={() => {
                    onPin();
                    onClose();
                  }}
                >
                  <Ionicons
                    name="pin-outline"
                    size={22}
                    color={Colors.textDark}
                  />
                  <Text style={styles.toolbarText}>Pin Message</Text>
                </TouchableOpacity>
              )}

              {/* Report Spam */}
              {canReportSpam && onReportSpam && (
                <TouchableOpacity
                  style={styles.toolbarItem}
                  onPress={() => {
                    onReportSpam();
                    onClose();
                  }}
                >
                  <Ionicons
                    name="flag-outline"
                    size={22}
                    color="#FF3B30"
                  />
                  <Text style={[styles.toolbarText, styles.dangerText]}>
                    Report Spam
                  </Text>
                </TouchableOpacity>
              )}

              {/* Empty State (shouldn't happen but just in case) */}
              {!canMarkUrgent && !canPin && !canReportSpam && (
                <View style={styles.emptyToolbar}>
                  <Text style={styles.emptyText}>No actions available</Text>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
  toolbar: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 240,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toolbarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  toolbarText: {
    fontSize: 16,
    color: Colors.textDark,
    fontWeight: '500',
    flex: 1,
  },
  dangerText: {
    color: '#FF3B30',
  },
  urgentBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  emptyToolbar: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMedium,
  },
});

