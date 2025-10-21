// app/index.tsx - TEMPORARY TEST CODE (will be replaced in Phase 1)
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { db } from '../firebase.config';

export default function Index() {
  const [status, setStatus] = useState('Testing Firebase...');
  const [error, setError] = useState('');

  useEffect(() => {
    testFirebase();
  }, []);

  const testFirebase = async () => {
    try {
      const docRef = await addDoc(collection(db, 'test'), {
        message: 'Hello from MessageAI',
        timestamp: serverTimestamp(),
      });
      
      setStatus(`✅ SUCCESS! Firebase is working.\nDoc ID: ${docRef.id}`);
      console.log('✅ Firebase test passed');
    } catch (err: any) {
      setError(`❌ ERROR: ${err.message}`);
      console.error('Firebase test failed:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phase 0 Setup Test</Text>
      <Text style={styles.status}>{status}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && status.includes('Testing') && <ActivityIndicator size="large" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
});
