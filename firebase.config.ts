import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import { Firestore, getFirestore, initializeFirestore } from 'firebase/firestore';
import { Functions, getFunctions } from 'firebase/functions';

// Import getReactNativePersistence dynamically to avoid TS issues
 
const { getReactNativePersistence } = require('firebase/auth');

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence for React Native
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  // If auth already initialized, get existing instance
  auth = getAuth(app);
}

// Initialize Firestore with cache settings for React Native
let db: Firestore;
try {
  db = initializeFirestore(app, {
    cacheSizeBytes: 0, // DISABLE CACHE FOR DEBUGGING
  });
} catch (error) {
  // If firestore already initialized, get existing instance
  db = getFirestore(app);
}

// Initialize Firebase Functions
const functions: Functions = getFunctions(app);

export { auth, db, functions };
