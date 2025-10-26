/**
 * Phase 4: Upgrade to Pro Modal
 * Shows upgrade prompt when free/trial users try to access AI features
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UpgradeToProModalProps {
  visible: boolean;
  onClose: () => void;
  trialDaysRemaining?: number;
  reason?: string;
}

export const UpgradeToProModal: React.FC<UpgradeToProModalProps> = ({
  visible,
  onClose,
  trialDaysRemaining,
  reason,
}) => {
  const handleUpgrade = async () => {
    // MVP: Dummy payment - instant upgrade
    Alert.alert(
      'Upgrade to Pro',
      'MVP Mode: Instant upgrade (no real payment)\n\nIn production, this would open Stripe payment flow.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade Now',
          onPress: async () => {
            // TODO: Call Cloud Function to upgrade user
            // For now, just show success
            Alert.alert(
              'Success!',
              'You\'ve been upgraded to Pro! (MVP simulation)',
              [{ text: 'OK', onPress: onClose }]
            );
          },
        },
      ]
    );
  };

  const features = [
    { icon: 'sparkles', text: 'AI Summaries' },
    { icon: 'checkbox-outline', text: 'Action Item Extraction' },
    { icon: 'bulb-outline', text: 'Decision Tracking' },
    { icon: 'search-outline', text: 'Semantic Search' },
    { icon: 'calendar-outline', text: 'Meeting Scheduler' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity}
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <View style={styles.iconContainer}>
                <Ionicons name="star" size={48} color="#FFD700" />
              </View>
              <Text style={styles.title}>Upgrade to Pro</Text>
              
              {trialDaysRemaining !== undefined && trialDaysRemaining > 0 ? (
                <Text style={styles.subtitle}>
                  {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left in your trial
                </Text>
              ) : (
                <Text style={styles.subtitle}>
                  Unlock powerful AI features
                </Text>
              )}
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
              <Text style={styles.featuresTitle}>What you'll get:</Text>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name={feature.icon as any} size={24} color="#007AFF" />
                  <Text style={styles.featureText}>{feature.text}</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                </View>
              ))}
            </View>

            {/* Pricing */}
            <View style={styles.pricingContainer}>
              <Text style={styles.priceAmount}>$9.99</Text>
              <Text style={styles.pricePeriod}>/ month</Text>
            </View>

            {/* Benefits */}
            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitItem}>✓ Cancel anytime</Text>
              <Text style={styles.benefitItem}>✓ Unlimited AI requests</Text>
              <Text style={styles.benefitItem}>✓ Create up to 5 workspaces</Text>
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgrade}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>

            {/* MVP Note */}
            <Text style={styles.mvpNote}>
              MVP Mode: Instant upgrade for testing
            </Text>

            {/* Footer */}
            <TouchableOpacity onPress={onClose} style={styles.maybeLaterButton}>
              <Text style={styles.maybeLaterText}>Maybe Later</Text>
            </TouchableOpacity>
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
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF9E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
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
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  featureText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  pricingContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  pricePeriod: {
    fontSize: 18,
    color: '#666',
    marginLeft: 4,
  },
  benefitsContainer: {
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  benefitItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  upgradeButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
  mvpNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  maybeLaterButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  maybeLaterText: {
    fontSize: 16,
    color: '#666',
  },
});

