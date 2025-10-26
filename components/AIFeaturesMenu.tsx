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
 * Phase 4 Access control:
 * - Pro users: Full access everywhere
 * - Trial users: Full access (with days remaining shown)
 * - Workspace members: Full access (if workspace active)
 * - Free users (no trial/workspace): Upgrade prompt
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
  onUpgradeRequired: () => void; // Phase 4: Trigger upgrade modal
  isGroupChat: boolean;
  canAccessAI: boolean; // Phase 4: Check if user has AI access
  trialDaysRemaining?: number; // Phase 4: Show trial info if applicable
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
  onUpgradeRequired,
  isGroupChat,
  canAccessAI,
  trialDaysRemaining,
}: AIFeaturesMenuProps) {
  const handleFeature = (callback: () => void) => {
    // Phase 4: Check AI access before allowing feature
    if (!canAccessAI) {
      onClose();
      setTimeout(onUpgradeRequired, 300); // Increased delay for modal transition
      return;
    }

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

          {/* Phase 4: Trial info banner (if applicable) */}
          {canAccessAI && trialDaysRemaining !== undefined && trialDaysRemaining >= 0 && (
            <View style={styles.trialInfo}>
              <Text style={styles.trialText}>
                ✨ {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left in trial
              </Text>
            </View>
          )}

          {/* Phase 4: Access locked banner (if no access) */}
          {!canAccessAI && (
            <TouchableOpacity 
              style={styles.lockedBanner}
              onPress={() => {
                onClose();
                setTimeout(onUpgradeRequired, 300); // Increased delay for modal transition
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.lockedIcon}>🔒</Text>
              <Text style={styles.lockedText}>Upgrade to Pro to unlock AI features</Text>
              <Text style={styles.lockedArrow}>›</Text>
            </TouchableOpacity>
          )}

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
  trialInfo: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  trialText: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '500',
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4E5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  lockedIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  lockedText: {
    flex: 1,
    fontSize: 13,
    color: '#F57C00',
    fontWeight: '500',
  },
  lockedArrow: {
    fontSize: 20,
    color: '#F57C00',
    fontWeight: '600',
    marginLeft: 4,
  },
});

