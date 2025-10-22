import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.config';

export const setUserOnline = async (uid: string) => {
  try {
    await setDoc(doc(db, 'users', uid), {
      isOnline: true,
      lastSeenAt: serverTimestamp(),
    }, { merge: true });  // CRITICAL: merge to avoid overwriting existing fields
    console.log('🟢 [presenceService] User set online:', uid);
  } catch {
    // Fail silently - presence updates are not critical
    // Only log in development to avoid alarming users
    console.log('⚠️ [presenceService] Could not set user online (this is okay):', uid);
  }
};

export const setUserOffline = async (uid: string) => {
  try {
    // Check if user is still authenticated before writing
    if (!auth.currentUser) {
      console.log('ℹ️ [presenceService] User already logged out, skipping offline update');
      return;
    }

    await setDoc(doc(db, 'users', uid), {
      isOnline: false,
      lastSeenAt: serverTimestamp(),
    }, { merge: true });  // CRITICAL: merge to avoid overwriting existing fields
    console.log('⚫ [presenceService] User set offline:', uid);
  } catch {
    // Fail silently - presence updates are not critical
    // Only log in development to avoid alarming users
    console.log('⚠️ [presenceService] Could not set user offline (this is okay):', uid);
  }
};

