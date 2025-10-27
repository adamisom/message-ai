/**
 * Phase 4: Trial Countdown Banner
 * Shows remaining trial days and upgrade prompt
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TrialBannerProps {
  daysRemaining: number;
  onUpgrade: () => void;
  onDismiss?: () => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({
  daysRemaining,
  onUpgrade,
  onDismiss,
}) => {
  // Color scheme based on days remaining
  const getColorScheme = () => {
    if (daysRemaining <= 1) {
      return { bg: '#FFE5E5', text: '#D32F2F', icon: '#D32F2F' }; // Red - urgent
    } else if (daysRemaining <= 2) {
      return { bg: '#FFF4E5', text: '#F57C00', icon: '#F57C00' }; // Orange - warning
    } else {
      return { bg: '#E3F2FD', text: '#1976D2', icon: '#1976D2' }; // Blue - info
    }
  };

  const colors = getColorScheme();
  
  const getMessage = () => {
    if (daysRemaining === 0) {
      return 'Your trial expires today!';
    } else if (daysRemaining === 1) {
      return 'Last day of your trial!';
    } else {
      return `${daysRemaining} days left in your Pro trial`;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <Ionicons
          name={daysRemaining <= 1 ? 'alert-circle' : 'time-outline'}
          size={20}
          color={colors.icon}
        />
        <View style={styles.textContainer}>
          <Text style={[styles.message, { color: colors.text }]}>
            {getMessage()}
          </Text>
          <Text style={[styles.subMessage, { color: colors.text }]}>
            Upgrade now to keep AI features
          </Text>
        </View>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onUpgrade}
          style={[styles.upgradeButton, { backgroundColor: colors.icon }]}
          activeOpacity={0.8}
        >
          <Text style={styles.upgradeButtonText}>Upgrade</Text>
        </TouchableOpacity>
        
        {onDismiss && daysRemaining > 1 && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subMessage: {
    fontSize: 12,
    opacity: 0.8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  upgradeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 8,
    marginLeft: 8,
  },
});

