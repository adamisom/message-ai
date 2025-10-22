import { StyleSheet, Text, View } from 'react-native';
import { formatLastSeen } from '../utils/timeFormat';

interface UserStatusBadgeProps {
  isOnline: boolean;
  lastSeenAt?: Date | { toDate: () => Date } | null;
  showText?: boolean;
}

export default function UserStatusBadge({ 
  isOnline, 
  lastSeenAt, 
  showText = false 
}: UserStatusBadgeProps) {
  if (isOnline) {
    return (
      <View style={styles.container}>
        <View style={styles.onlineDot} />
        {showText && <Text style={styles.onlineText}>Online</Text>}
      </View>
    );
  }

  if (!lastSeenAt) {
    return null;
  }

  const lastSeenDate = lastSeenAt instanceof Date 
    ? lastSeenAt 
    : lastSeenAt.toDate();

  return (
    <View style={styles.container}>
      {showText && (
        <Text style={styles.offlineText}>
          {formatLastSeen(lastSeenDate)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  onlineText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  offlineText: {
    fontSize: 12,
    color: '#999',
  },
});

