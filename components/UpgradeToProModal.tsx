/**
 * Phase 4: Upgrade to Pro Modal
 * Shows upgrade prompt when free/trial users try to access AI features
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  upgradeUserToPro,
  startFreeTrial,
  showUpgradeSuccessAlert,
  showTrialStartedAlert,
  showUpgradeErrorAlert,
  showTrialErrorAlert,
} from '../services/subscriptionService';
import { useAuthStore } from '../store/authStore';

interface UpgradeToProModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgradeSuccess?: () => void;
  onTrialStart?: () => void;
  trialDaysRemaining?: number;
  reason?: string;
}

export const UpgradeToProModal: React.FC<UpgradeToProModalProps> = ({
  visible,
  onClose,
  onUpgradeSuccess,
  onTrialStart,
  trialDaysRemaining,
  reason,
}) => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const user = useAuthStore((state: any) => state.user);

  // Check if user is eligible for free trial
  const isTrialEligible = !user?.trialUsed && !trialDaysRemaining;

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      await upgradeUserToPro();
      showUpgradeSuccessAlert(() => {
        onClose();
        onUpgradeSuccess?.();
      });
    } catch (error: any) {
      if (error.message !== 'Upgrade cancelled') {
        showUpgradeErrorAlert(error);
      }
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleStartTrial = async () => {
    setIsStartingTrial(true);
    try {
      await startFreeTrial();
      showTrialStartedAlert(() => {
        onClose();
        onTrialStart?.();
      });
    } catch (error: any) {
      showTrialErrorAlert(error);
    } finally {
      setIsStartingTrial(false);
    }
  };

  const features = [
    { icon: 'checkbox-outline', text: 'Track Action Items & Decisions' },
    { icon: 'sparkles', text: 'AI Summaries & Semantic Search' },
    { icon: 'calendar-outline', text: 'Meeting Scheduler & Auto-Detection of Urgent Messages' },
    { icon: 'create-outline', text: 'Edit & Delete Messages' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <View style={styles.iconContainer}>
                <Ionicons name="star" size={28} color="#FFD700" />
              </View>
              <Text style={styles.title}>Upgrade to Pro</Text>
              
              <Text style={styles.subtitle}>
                Unlock powerful AI features and private workspaces for your team
              </Text>
            </View>

            {/* Reason (if provided) */}
            {reason && (
              <View style={styles.reasonContainer}>
                <Ionicons name="information-circle" size={20} color="#007AFF" />
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            )}

            {/* Features List */}
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>AI Features:</Text>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name={feature.icon as any} size={20} color="#007AFF" />
                  <Text style={styles.featureText}>{feature.text}</Text>
                  <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                </View>
              ))}
            </View>

            {/* Pricing */}
            <View style={styles.pricingContainer}>
              <Text style={styles.priceAmount}>$3</Text>
              <Text style={styles.pricePeriod}>/ month</Text>
            </View>
            <Text style={styles.cancelAnytime}>Cancel anytime</Text>

            {/* CTA Button */}
            <TouchableOpacity
              style={[styles.upgradeButton, isUpgrading && styles.upgradeButtonDisabled]}
              onPress={handleUpgrade}
              activeOpacity={0.8}
              disabled={isUpgrading}
            >
              {isUpgrading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFF" />
                </>
              )}
            </TouchableOpacity>

            {/* MVP Note */}
            <Text style={styles.mvpNote}>
              MVP Mode: Instant upgrade for testing
            </Text>

            {/* Free Trial Button (if eligible) */}
            {isTrialEligible && (
              <>
                <TouchableOpacity
                  style={[styles.trialButton, isStartingTrial && styles.trialButtonDisabled]}
                  onPress={handleStartTrial}
                  activeOpacity={0.8}
                  disabled={isStartingTrial}
                >
                  {isStartingTrial ? (
                    <ActivityIndicator color="#007AFF" />
                  ) : (
                    <>
                      <Ionicons name="gift-outline" size={20} color="#007AFF" />
                      <Text style={styles.trialButtonText}>Start 5-Day Free Trial</Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text style={styles.trialNote}>
                  No credit card required
                </Text>
              </>
            )}

            {/* Footer */}
            <TouchableOpacity onPress={onClose} style={styles.maybeLaterButton}>
              <Text style={styles.maybeLaterText}>Maybe Later</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Workspace Features */}
            <View style={styles.workspaceFeaturesContainer}>
              <Text style={styles.workspaceFeaturesTitle}>Workspace Features:</Text>
              <Text style={styles.workspaceFeatureItem}>✓ Create up to 5 private workspaces</Text>
              <Text style={styles.workspaceFeatureItem}>✓ Invite up to 25 members per workspace</Text>
              <Text style={styles.workspaceFeatureItem}>✓ Assign action items to your team within chats</Text>
              <Text style={styles.workspaceFeatureItem}>✓ Edit and save AI-generated text & high-priority markers on messages</Text>
              <Text style={styles.workspacePricingNote}>50¢ per member per workspace</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40, // Increased padding from 20
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 540,
    maxHeight: '80%', // Add back max height with more breathing room
    paddingBottom: 4,
  },
  content: {
    maxHeight: '100%',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 12,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF9E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  reasonText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  featureText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#333',
  },
  pricingContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  pricePeriod: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  cancelAnytime: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
  },
  workspaceFeaturesContainer: {
    marginBottom: 4,
  },
  workspaceFeaturesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 10,
  },
  workspaceFeatureItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  workspacePricingNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  upgradeButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  upgradeButtonDisabled: {
    opacity: 0.6,
  },
  mvpNote: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  trialButton: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  trialButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  trialButtonDisabled: {
    opacity: 0.6,
  },
  trialNote: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  maybeLaterButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
  },
  maybeLaterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginBottom: 16,
  },
});

