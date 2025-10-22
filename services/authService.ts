/**
 * Authentication Service
 * Handles all Firebase Authentication operations and user profile management
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import { setUserOffline, setUserOnline } from './presenceService';

/**
 * User profile data structure
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  isOnline: boolean;
  lastSeenAt: any; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

/**
 * Register a new user with email, password, and display name
 * Creates Firebase Auth account and Firestore user profile
 */
export const registerUser = async (
  email: string,
  password: string,
  displayName: string
): Promise<UserProfile> => {
  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email.toLowerCase().trim(),
      password
    );
    const user = userCredential.user;

    // Create Firestore user profile
    const userProfile = await createUserProfile(user.uid, email, displayName);

    return userProfile;
  } catch (error: any) {
    console.error('Registration error code:', error.code);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Login user with email and password
 * Fetches user profile from Firestore and sets online status
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<UserProfile> => {
  try {
    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email.toLowerCase().trim(),
      password
    );
    const user = userCredential.user;

    // Fetch user profile from Firestore
    const userProfile = await getUserProfile(user.uid);

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Set user online
    await setUserOnline(user.uid);

    return userProfile;
  } catch (error: any) {
    console.error('Login error code:', error.code);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Logout current user
 * Sets user offline and signs out from Firebase Auth
 */
export const logoutUser = async (): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (user) {
      // Set user offline before signing out
      await setUserOffline(user.uid);
    }

    await signOut(auth);
  } catch (error: any) {
    console.error('Logout error:', error);
    throw new Error('Failed to logout. Please try again.');
  }
};

/**
 * Create user profile in Firestore
 */
export const createUserProfile = async (
  uid: string,
  email: string,
  displayName: string
): Promise<UserProfile> => {
  try {
    const userProfile: UserProfile = {
      uid,
      email: email.toLowerCase().trim(),
      displayName: displayName.trim(),
      isOnline: true,
      lastSeenAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', uid), userProfile);

    return userProfile;
  } catch (error: any) {
    console.error('Create profile error:', error);
    throw new Error('Failed to create user profile');
  }
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (
  uid: string
): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }

    return null;
  } catch (error: any) {
    console.error('Get profile error:', error);
    throw new Error('Failed to fetch user profile');
  }
};

/**
 * Convert Firebase Auth error codes to user-friendly messages
 */
const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please login instead.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please contact support.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please register first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    default:
      return 'An error occurred. Please try again.';
  }
};

