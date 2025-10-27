/**
 * Phase 4: Trial Workspace Restriction Modal
 * Shows when trial users try to create workspaces
 */

import { Ionicons } from '@expo/vector-icons';
import { httpsCallable } from 'firebase/functions';
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
import { functions } from '../firebase.config';
import { Alerts } from '../utils/alerts';
import { Colors } from '../utils/colors';

interface TrialWorkspaceModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgradeSuccess: () => void;
}

export function TrialWorkspaceModal({
  visible,
  onClose,
  onUpgradeSuccess,
}: TrialWorkspaceModalProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    // MVP: Dummy payment - instant upgrade via Cloud Function
    Alerts.confirm(
      'Upgrade to Pro',
      'MVP Mode: Instant upgrade (no real payment)\n\nIn production, this would open Stripe payment flow.',
      async () => {
        setIsUpgrading(true);
        try {
          const upgradeToPro = httpsCallable(functions, 'upgradeToPro');
          const result = await upgradeToPro({});
          
          Alerts.success(
            'You\'ve been upgraded to Pro! 🎉',
            () => {
              onClose();
              onUpgradeSuccess();
            }
          );
        } catch (error: any) {
          Alerts.error(`Failed to upgrade: ${error.message}`);
        } finally {
          setIsUpgrading(false);
        }
      },
      { confirmText: 'Upgrade Now' }
    );
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
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
                <Ionicons name="business-outline" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.title}>Workspaces Require Pro</Text>
              <Text style={styles.subtitle}>
                Free trial only includes AI features 🙂
              </Text>
            </View>

            {/* Features List */}
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>Upgrade now to unlock:</Text>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                <Text style={styles.featureText}>Create up to 5 workspaces</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                <Text style={styles.featureText}>Invite up to 25 members per workspace</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                <Text style={styles.featureText}>Assign action items to your team</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                <Text style={styles.featureText}>Edit and save AI-generated text & high-priority markers</Text>
              </View>
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

            {/* Maybe Later */}
            <TouchableOpacity
              style={styles.maybeLaterButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.maybeLaterText}>Maybe Later</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 540,
    maxHeight: '80%',
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
    backgroundColor: `${Colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  featuresContainer: {
    marginBottom: 12,
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
    paddingHorizontal: 4,
  },
  featureText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  pricingContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.primary,
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
    marginBottom: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeButtonDisabled: {
    opacity: 0.6,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginRight: 8,
  },
  maybeLaterButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  maybeLaterText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
});
