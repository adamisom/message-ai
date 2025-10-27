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
  collection,
  doc,
  getDocFromServer,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import { setUserOffline, setUserOnline } from './presenceService';

// Phase 4: 500 User MVP Limit
const MAX_MVP_USERS = 500;

/**
 * User profile data structure
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string; // Required 10-digit phone number
  isOnline: boolean;
  lastSeenAt: any; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  // Phase 4: Paid tier fields
  isPaidUser?: boolean;
  subscriptionTier?: 'free' | 'pro';
  subscriptionStartedAt?: any;
  subscriptionEndsAt?: any;
  // Phase 4: Trial fields
  trialStartedAt?: any;
  trialEndsAt?: any;
  trialUsed?: boolean;
  // Phase 4: Workspace fields
  workspacesOwned?: string[];
  workspacesMemberOf?: string[];
  // Phase 4: Spam prevention
  spamStrikes?: number;
  spamBanned?: boolean;
  spamReportsReceived?: {
    reportedBy: string;
    reason: 'workspace' | 'groupChat';
    timestamp: any;
    workspaceId?: string;
    conversationId?: string;
  }[];
  // Sub-Phase 6.5: Direct message spam prevention (Phase C)
  blockedUsers?: string[]; // Array of user IDs that this user has blocked
  hiddenConversations?: string[]; // Array of conversation IDs hidden due to spam reports
  dmPrivacySetting?: 'private' | 'public'; // Default: 'private' (requires invitation for DMs)
}

/**
 * Register a new user with email, password, and display name
 * Creates Firebase Auth account and Firestore user profile
 * Phase 4: Checks 500 user MVP limit and initializes 5-day trial
 */
export const registerUser = async (
  email: string,
  password: string,
  displayName: string,
  phoneNumber: string
): Promise<UserProfile> => {
  try {
    // Phase 4: Check 500 user limit
    const userCount = await getTotalUserCount();
    if (userCount >= MAX_MVP_USERS) {
      throw new Error('Sorry: in MVP mode, max users reached. Please check back later.');
    }

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email.toLowerCase().trim(),
      password
    );
    const user = userCredential.user;

    // Create Firestore user profile (includes trial initialization)
    const userProfile = await createUserProfile(user.uid, email, displayName, phoneNumber);

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
 * Update user profile fields
 * Used for updating settings like dmPrivacySetting, phoneNumber, etc.
 */
export const updateUserProfile = async (
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    console.log('[authService] User profile updated:', Object.keys(updates));
  } catch (error) {
    console.error('[authService] Error updating user profile:', error);
    throw error;
  }
};

/**
 * Create user profile in Firestore
 * Phase 4: Initializes 5-day free trial
 */
export const createUserProfile = async (
  uid: string,
  email: string,
  displayName: string,
  phoneNumber: string
): Promise<UserProfile> => {
  try {
    const now = new Date();
    const fiveDaysFromNow = new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000));

    const userProfile: UserProfile = {
      uid,
      email: email.toLowerCase().trim(),
      displayName: displayName.trim(),
      phoneNumber: phoneNumber.replace(/\D/g, ''), // Store as 10 digits only
      isOnline: true,
      lastSeenAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Phase 4: Free tier fields
      isPaidUser: false,
      subscriptionTier: 'free',
      // Phase 4: 5-day trial initialization
      trialStartedAt: serverTimestamp(),
      trialEndsAt: Timestamp.fromDate(fiveDaysFromNow),
      trialUsed: true,
      // Phase 4: Workspace fields
      workspacesOwned: [],
      workspacesMemberOf: [],
      // Phase 4: Spam prevention
      spamStrikes: 0,
      spamBanned: false,
      spamReportsReceived: [],
      // Sub-Phase 6.5: User blocking & conversation hiding
      blockedUsers: [],
      hiddenConversations: [],
      // Sub-Phase 11: DM Privacy (default: private)
      dmPrivacySetting: 'private',
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
    // Use getDocFromServer to bypass local cache and get fresh data from server
    // This ensures we always get the latest subscription/trial status
    const docSnap = await getDocFromServer(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }

    return null;
  } catch (error: any) {
    console.error('[getUserProfile] Error fetching profile:', error);
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

/**
 * Phase 4: Get total user count (for 500 user MVP limit)
 */
async function getTotalUserCount(): Promise<number> {
  try {
    // Query all users and count them
    // Note: In production, you'd use Cloud Function counter or aggregation
    const usersQuery = query(collection(db, 'users'));
    const snapshot = await getDocs(usersQuery);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting user count:', error);
    // If error, allow signup (fail open)
    return 0;
  }
}
