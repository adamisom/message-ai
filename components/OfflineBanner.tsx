import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    console.log('🌐 [OfflineBanner] Setting up network listener');
    
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected;
      console.log('🌐 [OfflineBanner] Network state changed:', offline ? 'OFFLINE' : 'ONLINE');
      setIsOffline(offline);
    });

    // CRITICAL: Cleanup on unmount
    return () => {
      console.log('🔌 [OfflineBanner] Cleaning up network listener');
      unsubscribe();
    };
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        ⚠️ You&apos;re offline. Messages will send when reconnected.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FF9800',
    padding: 8,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});

