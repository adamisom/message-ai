import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { commonModalStyles } from '../styles/commonModalStyles';
import { Workspace } from '../types/workspace';
import { Colors } from '../utils/colors';
import { ModalHeader } from './modals/ModalHeader';

interface CapacityExpansionModalProps {
  visible: boolean;
  workspace: Workspace | null;
  newMemberCount: number; // Current members + 1
  onClose: () => void;
  onExpand: (newMaxUsers: number) => Promise<void>;
}

export default function CapacityExpansionModal({
  visible,
  workspace,
  newMemberCount,
  onClose,
  onExpand,
}: CapacityExpansionModalProps) {
  const [isExpanding, setIsExpanding] = useState(false);

  if (!workspace) return null;

  const currentCapacity = workspace.maxUsersThisMonth;
  const additionalSeats = newMemberCount - currentCapacity;

  // Calculate pro-rated charge
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - today.getDate() + 1;
  const proratedCharge = (additionalSeats * 0.5) * (daysRemaining / daysInMonth);
  const nextMonthCharge = newMemberCount * 0.5;

  const handleExpand = async () => {
    setIsExpanding(true);
    try {
      await onExpand(newMemberCount);
      Alert.alert('Success', 'Workspace expanded! Invitation sent.');
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to expand workspace');
    } finally {
      setIsExpanding(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      transparent
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <ModalHeader title="Workspace Capacity Full" onClose={onClose} />

          <View style={styles.content}>
            {/* Current Status */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your workspace currently has:</Text>
              <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={20} color={Colors.textMedium} />
                <Text style={styles.infoText}>
                  {workspace.members.length} members (capacity: {currentCapacity})
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                <Text style={styles.infoText}>
                  Adding this member requires expanding to {newMemberCount} seats
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Pricing */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Expansion Charge:</Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Base cost:</Text>
                <Text style={styles.priceValue}>$0.50/member/month</Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Pro-rated for remaining days:</Text>
                <Text style={styles.priceValue}>
                  $0.50 × {additionalSeats} seat{additionalSeats > 1 ? 's' : ''} × {daysRemaining}/{daysInMonth} days
                </Text>
              </View>

              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total due today:</Text>
                <Text style={styles.totalValue}>${proratedCharge.toFixed(2)}</Text>
              </View>

              <View style={styles.nextMonthInfo}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                <Text style={styles.nextMonthText}>
                  Next month (starting {new Date(today.getFullYear(), today.getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}): ${nextMonthCharge.toFixed(2)}/month
                </Text>
              </View>
              <Text style={styles.nextMonthSubtext}>
                ({newMemberCount} members × $0.50)
              </Text>
            </View>

            {/* MVP Note */}
            <View style={styles.mvpNote}>
              <Text style={styles.mvpNoteText}>
                💡 MVP Mode: Payment auto-succeeds for testing
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isExpanding}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.expandButton, isExpanding && styles.disabled]}
              onPress={handleExpand}
              disabled={isExpanding}
            >
              {isExpanding ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="arrow-up-circle-outline" size={20} color="#fff" />
                  <Text style={styles.expandButtonText}>Expand & Pay</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textMedium,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: Colors.textMedium,
  },
  priceValue: {
    fontSize: 14,
    color: Colors.textDark,
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  nextMonthInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    gap: 8,
  },
  nextMonthText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textDark,
    fontWeight: '500',
  },
  nextMonthSubtext: {
    fontSize: 12,
    color: Colors.textMedium,
    marginLeft: 28,
    marginTop: 4,
  },
  mvpNote: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  mvpNoteText: {
    fontSize: 12,
    color: '#E65100',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
  },
  expandButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    gap: 8,
  },
  expandButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabled: {
    opacity: 0.5,
  },
});

