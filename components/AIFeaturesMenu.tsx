/**
 * Sparkle Menu (✨)
 * 
 * Modal menu for accessing AI-powered features including:
 * - Thread Summarization
 * - Action Items Extraction
 * - Smart Semantic Search
 * - Decision Tracking
 * - Proactive Meeting Scheduler
 * 
 * Access control:
 * - Pro users: Full access everywhere
 * - Free users in workspaces: Full access
 * - Free users outside workspaces: Upgrade prompt
 */

import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../utils/colors';

interface AIFeaturesMenuProps {
  visible: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
  onOpenSummary: () => void;
  onOpenActionItems: () => void;
  onOpenDecisions: () => void;
  onOpenMeetingScheduler: () => void;
  isGroupChat: boolean;
}

// Sparkle Menu Component
export function AIFeaturesMenu({
  visible,
  onClose,
  onOpenSearch,
  onOpenSummary,
  onOpenActionItems,
  onOpenDecisions,
  onOpenMeetingScheduler,
  isGroupChat,
}: AIFeaturesMenuProps) {
  const handleFeature = (callback: () => void) => {
    onClose();
    // Small delay to let modal close before opening next one
    setTimeout(callback, 100);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menu}>
          <Text style={styles.header}>AI Features</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleFeature(onOpenSearch)}
          >
            <Text style={styles.menuIcon}>🔍</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Search Messages</Text>
              <Text style={styles.menuDescription}>
                Semantic search with AI
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleFeature(onOpenSummary)}
          >
            <Text style={styles.menuIcon}>📝</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Summarize Thread</Text>
              <Text style={styles.menuDescription}>
                Get key points from conversation
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleFeature(onOpenActionItems)}
          >
            <Text style={styles.menuIcon}>✓</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Action Items</Text>
              <Text style={styles.menuDescription}>
                Extract tasks and to-dos
              </Text>
            </View>
          </TouchableOpacity>

          {isGroupChat && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleFeature(onOpenDecisions)}
            >
              <Text style={styles.menuIcon}>💡</Text>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Decisions</Text>
                <Text style={styles.menuDescription}>
                  Track group decisions
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleFeature(onOpenMeetingScheduler)}
          >
            <Text style={styles.menuIcon}>📅</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Suggest Meeting Times</Text>
              <Text style={styles.menuDescription}>
                AI-powered scheduling assistant
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menu: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
    paddingTop: 16,
  },
  header: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textDark,
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 13,
    color: Colors.textMedium,
  },
  cancelButton: {
    borderBottomWidth: 0,
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary,
    textAlign: 'center',
  },
});

