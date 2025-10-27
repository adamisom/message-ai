import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SpamWarningBannerProps {
  status: 'warning' | 'danger' | 'temp_banned' | 'permanently_banned';
  message: string;
  strikeCount: number;
  banEndsAt?: number | null;
  onDismiss?: () => void;
}

export default function SpamWarningBanner({
  status,
  message,
  strikeCount,
  banEndsAt,
  onDismiss,
}: SpamWarningBannerProps) {
  const getBackgroundColor = () => {
    switch (status) {
      case 'warning':
        return '#FFF3CD'; // Yellow
      case 'danger':
        return '#F8D7DA'; // Red
      case 'temp_banned':
      case 'permanently_banned':
        return '#F5C2C7'; // Darker red
      default:
        return '#FFF3CD';
    }
  };

  const getIconColor = () => {
    switch (status) {
      case 'warning':
        return '#856404'; // Dark yellow
      case 'danger':
        return '#842029'; // Dark red
      case 'temp_banned':
      case 'permanently_banned':
        return '#842029';
      default:
        return '#856404';
    }
  };

  const getTextColor = () => {
    switch (status) {
      case 'warning':
        return '#856404';
      case 'danger':
      case 'temp_banned':
      case 'permanently_banned':
        return '#842029';
      default:
        return '#856404';
    }
  };

  const formatBanEndTime = () => {
    if (!banEndsAt) return '';
    const endDate = new Date(banEndsAt);
    const now = new Date();
    const hoursRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (60 * 60 * 1000));
    return ` (${hoursRemaining}h remaining)`;
  };

  return (
    <View style={[styles.banner, { backgroundColor: getBackgroundColor() }]}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={status === 'warning' ? 'warning' : 'alert-circle'}
          size={24}
          color={getIconColor()}
        />
      </View>

      <View style={styles.content}>
        <Text style={[styles.message, { color: getTextColor() }]}>
          {message}
          {status === 'temp_banned' && formatBanEndTime()}
        </Text>
        <Text style={[styles.strikeCount, { color: getTextColor() }]}>
          {strikeCount} spam report{strikeCount !== 1 ? 's' : ''} in last 30 days
        </Text>
      </View>

      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <Ionicons name="close" size={20} color={getIconColor()} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  strikeCount: {
    fontSize: 12,
    opacity: 0.8,
  },
  dismissButton: {
    padding: 4,
  },
});

