/**
 * Phase 4: Subscription Management Screen (Placeholder)
 * 
 * Displays subscription details for Pro users.
 * Includes placeholder buttons for future payment management functionality.
 * Accessed from Profile screen's "Manage Subscription" button.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../utils/colors';

/**
 * Format date for monthly billing (next month from now)
 */
function formatNextMonthlyBilling(): string {
  const nextBilling = new Date();
  nextBilling.setMonth(nextBilling.getMonth() + 1);
  return nextBilling.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  
  if (!user || !user.isPaidUser) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.textMedium} />
          <Text style={styles.errorText}>No active subscription found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Calculate next monthly billing date
  const nextBillingDate = formatNextMonthlyBilling();
  
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Subscription</Text>
        <View style={styles.closeButtonPlaceholder} />
      </View>
      
      {/* Subscription Details */}
      <View style={styles.detailsSection}>
        <View style={styles.badge}>
          <Ionicons name="diamond" size={24} color={Colors.primary} />
          <Text style={styles.badgeText}>Pro User</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Plan:</Text>
          <Text style={styles.detailValue}>Pro</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Price:</Text>
          <Text style={styles.detailValue}>$3/month</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Next billing:</Text>
          <Text style={styles.detailValue}>{nextBillingDate}</Text>
        </View>
      </View>
      
      {/* Placeholder Buttons */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.placeholderButton}
          disabled
          activeOpacity={0.7}
        >
          <Ionicons name="card-outline" size={20} color="#999" />
          <Text style={styles.placeholderButtonText}>Change Payment Method</Text>
        </TouchableOpacity>
        <Text style={styles.comingSoonText}>(Coming soon)</Text>
        
        <TouchableOpacity
          style={[styles.placeholderButton, styles.cancelButton]}
          disabled
          activeOpacity={0.7}
        >
          <Ionicons name="close-circle-outline" size={20} color="#999" />
          <Text style={styles.placeholderButtonText}>Cancel Subscription</Text>
        </TouchableOpacity>
        <Text style={styles.comingSoonText}>(Coming soon)</Text>
      </View>
      
      {/* MVP Notice */}
      <View style={styles.mvpNotice}>
        <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
        <Text style={styles.mvpNoticeText}>
          MVP Mode: Payment management features will be available in production.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60, // Extra padding to avoid iPhone status bar overlap
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonPlaceholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textMedium,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.primary}10`,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginBottom: 24,
  },
  badgeText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 16,
    color: Colors.textMedium,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
  },
  actionsSection: {
    marginBottom: 24,
  },
  placeholderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    opacity: 0.6,
  },
  cancelButton: {
    borderColor: '#FFCCCC',
    backgroundColor: '#FFF5F5',
  },
  placeholderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginLeft: 8,
  },
  comingSoonText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  mvpNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
  },
  mvpNoticeText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: Colors.primary,
    lineHeight: 18,
  },
});

